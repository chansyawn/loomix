import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import {
  atomicJson,
  publishManifest,
  readManifest,
  STAGE_MANIFEST_VERSION,
  stageManifestFile,
} from "./manifest.ts";
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
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    kind: "environment",
    clientSnapshotId: digest([]),
    id,
    status: "verified",
    createdAt: new Date().toISOString(),
    inputs: { id: digest([]), files: [], sha256: digest([]) },
    implementation: digest("implementation"),
    profileHash: digest("profile"),
    tools: {},
    outputs: await inventory(directory),
    result: { passed: true, validation: "passed", failures: [] },
  };
  await publishManifest(directory, manifest);
  assert.deepEqual(await readManifest(directory, "environment"), manifest);
  const file = path.join(directory, stageManifestFile("environment"));
  for (const altered of [
    { ...manifest, clientSnapshotId: undefined },
    { ...manifest, clientSnapshotId: digest("other client") },
    { ...manifest, inputs: { ...manifest.inputs, id: digest("other client") } },
    { ...manifest, id: digest("another environment") },
    { ...manifest, kind: "extraction", clientSnapshotId: undefined },
  ]) {
    atomicJson(file, altered);
    await assert.rejects(readManifest(directory, "environment"));
  }
  for (const altered of [
    ...[3, 4, 5].map((stageManifestVersion) => ({ ...manifest, stageManifestVersion })),
    { ...manifest, stageManifestVersion: undefined, schemaVersion: 2 },
  ]) {
    atomicJson(file, altered);
    await assert.rejects(readManifest(directory, "environment"), /refresh/);
  }
  await publishManifest(directory, manifest);
  fs.writeFileSync(path.join(directory, "output.json"), "[]");
  await assert.rejects(readManifest(directory, "environment"), /Hash mismatch/);
  await assert.rejects(publishManifest(directory, manifest), /Hash mismatch/);
  for (const relative of ["../escape", "/absolute", "a/../../escape", "a\\..\\escape"])
    assert.throws(() => within(root, relative), /Unsafe/);
  fs.symlinkSync(directory, path.join(root, "alias"));
  assert.throws(() => within(root, "alias/output.json"), /link/);
  assert.throws(() => identityDirectory("extractions", "../outside"), /identity/);
  assert.ok(fs.readdirSync(directory).every((file) => !file.endsWith(".tmp")));
});
