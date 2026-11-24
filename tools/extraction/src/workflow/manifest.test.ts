import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { test, vi } from "vite-plus/test";
import {
  assertStageDestination,
  atomicJson,
  publishManifest,
  readManifest,
  resolveStage,
  STAGE_MANIFEST_VERSION,
  stageManifestFile,
  stageOutput,
} from "./manifest.ts";
import type { Manifest } from "./manifest.ts";
import { digest, inventory } from "./hashing.ts";
import { within } from "../paths.ts";

test("manifests reject corrupt outputs, unsupported schema and unsafe paths", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-manifest-"));
  vi.stubEnv("LOOMIX_DATA_ROOT", root);
  t.onTestFinished(() => {
    vi.unstubAllEnvs();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const id = digest("environment");
  const { directory } = stageOutput("environment", id, `0.95.2--${"a".repeat(12)}`);
  fs.mkdirSync(directory, { recursive: true });
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
    ...[3, 4, 5, 6].map((stageManifestVersion) => ({ ...manifest, stageManifestVersion })),
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
  assert.throws(() => resolveStage("extraction", "../outside"), /identity/);
  assert.ok(fs.readdirSync(directory).every((file) => !file.endsWith(".tmp")));
});

test("阶段引用使用完整 ID 或准确目录名，并检查短哈希冲突", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-stage-"));
  vi.stubEnv("LOOMIX_DATA_ROOT", root);
  t.onTestFinished(() => {
    vi.unstubAllEnvs();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const id = "a".repeat(64);
  const otherId = "a".repeat(12) + "b".repeat(52);
  const upstream = "0.95.2-d1449213-r1391927-m5662883--cccccccccccc";
  const kind = "environment";
  const stage = stageOutput(kind, id, upstream);
  const name = path.basename(stage.directory);
  assert.equal(name, "0.95.2-d1449213-r1391927-m5662883--aaaaaaaaaaaa");

  const parent = path.dirname(stage.directory);
  const legacy = path.join(parent, id);
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, "output.json"), "{}");
  const manifest: Manifest = {
    stageManifestVersion: STAGE_MANIFEST_VERSION,
    kind,
    id,
    clientSnapshotId: digest([]),
    status: "verified",
    createdAt: new Date().toISOString(),
    inputs: { id: digest([]), files: [], sha256: digest([]) },
    implementation: digest("implementation"),
    profileHash: digest("profile"),
    tools: {},
    outputs: await inventory(legacy),
    result: { passed: true, validation: "passed", failures: [] },
  };
  await publishManifest(legacy, manifest);
  assert.throws(() => resolveStage(kind, id), /Missing environment/);
  await assert.rejects(readManifest(legacy, kind), /identity mismatch/);
  fs.mkdirSync(stage.directory);
  assert.throws(() => resolveStage(kind, name), /ENOENT/);
  fs.rmdirSync(stage.directory);
  fs.renameSync(legacy, stage.directory);
  assert.deepEqual(resolveStage(kind, id), stage);
  assert.deepEqual(resolveStage(kind, name), stage);
  assert.throws(() => resolveStage(kind, name.slice(-12)), /Invalid environment identity/);
  assert.throws(() => resolveStage(kind, `../${name}`), /Invalid environment identity/);
  assert.throws(() => resolveStage("resource-package", name), /Invalid resource-package identity/);
  assert.doesNotThrow(() => assertStageDestination(kind, stage));
  assert.throws(
    () => assertStageDestination(kind, { ...stage, id: otherId }),
    /Stage directory collision/,
  );

  const other = stageOutput(kind, otherId, "0.95.2--cccccccccccc");
  fs.symlinkSync(stage.directory, other.directory);
  assert.throws(() => resolveStage(kind, path.basename(other.directory)), /symbolic link/);
  fs.unlinkSync(other.directory);
  fs.cpSync(stage.directory, other.directory, { recursive: true });
  await publishManifest(other.directory, { ...manifest, id: otherId });
  assert.deepEqual(resolveStage(kind, id), stage);
  assert.deepEqual(resolveStage(kind, otherId), other);
  await assert.rejects(readManifest(stage.directory, kind, otherId), /identity mismatch/);
  await publishManifest(other.directory, manifest);
  assert.throws(() => resolveStage(kind, id), /Duplicate environment ID/);
});
