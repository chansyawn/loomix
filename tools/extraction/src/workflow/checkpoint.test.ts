import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { runCheckpoints } from "./checkpoint.ts";
import { digest } from "./hashing.ts";

test("checkpoints verify bytes, inputs and dependent outputs before reuse", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-checkpoints-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = [0, 0, 0];
  const tasks = calls.map((_, index) => ({
    name: `stage-${index}`,
    dependencies: index ? [`stage-${index - 1}`] : [],
    run: async () => {
      calls[index]++;
      fs.writeFileSync(path.join(root, `${index}.txt`), `stage ${index}`);
    },
    outputs: () => [`${index}.txt`],
  }));
  const run = (input = "original") => runCheckpoints(root, digest(input), tasks);
  await run();
  const first = await run();
  assert.deepEqual(calls, [1, 1, 1]);
  fs.writeFileSync(path.join(root, "1.txt"), "tampered");
  assert.deepEqual(await run(), first);
  assert.deepEqual(calls, [1, 2, 2]);
  await run("changed profile or implementation");
  assert.deepEqual(calls, [2, 3, 3]);
  fs.rmSync(path.join(root, "0.txt"));
  tasks[0].run = async () => {
    throw new Error("decode failed");
  };
  await assert.rejects(run(), /decode failed/);
  assert.deepEqual(fs.readdirSync(path.join(root, "checkpoints")), []);
});

test("frozen admissions invalidate structure and images while preserving decode", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-admission-checkpoints-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  const calls = { admissions: 0, decode: 0, structure: 0, images: 0 };
  const dependencies = {
    admissions: [],
    decode: [],
    structure: ["admissions", "decode"],
    images: ["structure"],
  };
  const tasks = (Object.keys(calls) as (keyof typeof calls)[]).map((name) => ({
    name,
    dependencies: dependencies[name],
    run: async () => {
      calls[name]++;
      fs.writeFileSync(path.join(root, name), name);
    },
    outputs: () => [name],
  }));
  const identity = digest({ admissions: "original bytes" });
  const first = await runCheckpoints(root, identity, tasks);
  assert.deepEqual(await runCheckpoints(root, identity, tasks), first);
  assert.deepEqual(calls, { admissions: 1, decode: 1, structure: 1, images: 1 });
  fs.writeFileSync(path.join(root, "admissions"), "tampered");
  await runCheckpoints(root, identity, tasks);
  assert.deepEqual(calls, { admissions: 2, decode: 1, structure: 2, images: 2 });
});
