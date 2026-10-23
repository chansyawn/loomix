import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { atomicJson, publishManifest, readManifest } from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { digest, inventory } from "./hashing.ts";
import { within, identityDirectory } from "../paths.ts";

test("manifests reject corrupt outputs, unsupported schema and unsafe paths", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-manifest-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  const id = digest("environment");
  const directory = path.join(root, id);
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, "output.json"), "{}");
  const manifest: Manifest = {
    schemaVersion: 1,
    kind: "environment",
    id,
    status: "verified",
    createdAt: new Date().toISOString(),
    inputs: { id: "client", files: [], sha256: digest([]) },
    implementation: digest("implementation"),
    profileHash: digest("profile"),
    tools: {},
    outputs: await inventory(directory),
    result: { passed: true, validation: "passed", failures: [] },
  };
  await publishManifest(directory, manifest);
  assert.deepEqual(await readManifest(directory, "environment"), manifest);
  fs.writeFileSync(path.join(directory, "output.json"), "[]");
  await assert.rejects(readManifest(directory, "environment"), /Hash mismatch/);
  await assert.rejects(publishManifest(directory, manifest), /Hash mismatch/);
  atomicJson(path.join(directory, "environment-manifest.json"), { ...manifest, schemaVersion: 2 });
  await assert.rejects(readManifest(directory, "environment"));
  for (const relative of ["../escape", "/absolute", "a/../../escape", "a\\..\\escape"])
    assert.throws(() => within(root, relative), /Unsafe/);
  fs.symlinkSync(directory, path.join(root, "alias"));
  assert.throws(() => within(root, "alias/output.json"), /link/);
  assert.throws(() => identityDirectory("runs", "../outside"), /identity/);
  assert.ok(fs.readdirSync(directory).every((file) => !file.endsWith(".tmp")));
});
