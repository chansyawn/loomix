import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { runCheckpoints } from "./checkpoints.ts";
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
