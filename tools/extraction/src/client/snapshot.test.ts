import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, vi } from "vite-plus/test";
import type { TestContext } from "vite-plus/test";
import { clientsRoot } from "../paths.ts";
import { profile } from "../profile.ts";
import * as hashing from "../workflow/hashing.ts";
import { writeJson } from "../workflow/json.ts";
import { importClient, openClientSnapshot, resolveClientSnapshot } from "./snapshot.ts";

function fixture(testContext: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-client-snapshot-"));
  vi.stubEnv("LOOMIX_DATA_ROOT", path.join(root, "shared"));
  testContext.onTestFinished(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    const makeWritable = (directory: string) => {
      fs.chmodSync(directory, 0o755);
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) makeWritable(path.join(directory, entry.name));
      }
    };
    makeWritable(root);
    fs.rmSync(root, { recursive: true });
  });
  const source = path.join(root, "source");
  const revisions = path.join(
    source,
    profile.paths.gameRoot,
    "Persistent/versions",
    profile.manifestId,
  );
  fs.mkdirSync(revisions, { recursive: true });
  fs.writeFileSync(
    path.join(source, profile.paths.clientIni),
    `game_version=${profile.gameVersion}\n`,
  );
  fs.writeFileSync(path.join(source, "client.bin"), "first snapshot");
  writeJson(path.join(revisions, "data_revision.json"), {
    branch: profile.branch,
    revision: profile.dataRevision,
  });
  writeJson(path.join(revisions, "res_revision.json"), { revision: profile.resourceRevision });
  return source;
}

test("按客户端版本命名，并发重复导入复用只读快照", async (testContext) => {
  const source = fixture(testContext);
  const [first, second] = await Promise.all([
    importClient(source, profile.paths),
    importClient(source, profile.paths),
  ]);
  assert.equal(first.id, second.id);
  assert.equal(first.directory, second.directory);
  assert.equal(
    path.basename(first.directory),
    `${profile.gameVersion}-d${profile.dataRevision}-r${profile.resourceRevision}-m${profile.manifestId}--${first.id.slice(0, 12)}`,
  );
  assert.deepEqual(fs.readdirSync(clientsRoot()), [path.basename(first.directory)]);
  assert.equal(resolveClientSnapshot(profile).snapshot.id, first.id);
  const snapshot = openClientSnapshot(first.id);
  const file = snapshot.resolvePath("client.bin");
  assert.equal(fs.readFileSync(file, "utf8"), "first snapshot");
  assert.equal(fs.statSync(file).mode & 0o222, 0);
  assert.throws(() => snapshot.resolvePath("../outside"), /Unsafe relative path/);
  fs.chmodSync(path.dirname(file), 0o755);
  const link = path.join(path.dirname(file), "linked-client");
  fs.symlinkSync(source, link, "dir");
  assert.throws(() => snapshot.resolvePath("linked-client/config.ini"), /symbolic link/);
  await assert.rejects(snapshot.verify(), /symbolic link/);
  fs.unlinkSync(link);
  await snapshot.verify();
  fs.chmodSync(file, 0o644);
  fs.writeFileSync(file, "modified snapshot");
  await assert.rejects(snapshot.verify(), /inventory changed/);
  await assert.rejects(importClient(source, profile.paths), /inventory changed/);
});

test("默认与显式选择均检查完整版本，同版本不同快照需要完整 ID", async (testContext) => {
  const source = fixture(testContext);
  assert.throws(() => resolveClientSnapshot(profile), /No client snapshot.*client import/);
  const first = await importClient(source, profile.paths);
  for (const incompatible of [
    { gameVersion: "0.1.0" },
    { branch: "other" },
    { dataRevision: 1 },
    { resourceRevision: 1 },
    { manifestId: "1" },
  ]) {
    assert.throws(
      () => resolveClientSnapshot({ ...profile, ...incompatible }),
      /No client snapshot/,
    );
    assert.throws(
      () => resolveClientSnapshot({ ...profile, ...incompatible }, first.id),
      /does not match/,
    );
  }
  const revision = path.join(
    source,
    profile.paths.gameRoot,
    "Persistent/versions",
    profile.manifestId,
    "res_revision.json",
  );
  writeJson(revision, { revision: 1 });
  const otherRevision = await importClient(source, profile.paths);
  assert.equal(resolveClientSnapshot(profile).snapshot.id, first.id);
  assert.equal(
    resolveClientSnapshot({ ...profile, resourceRevision: 1 }).snapshot.id,
    otherRevision.id,
  );
  writeJson(revision, { revision: profile.resourceRevision });
  fs.writeFileSync(path.join(source, "client.bin"), "second snapshot");
  const second = await importClient(source, profile.paths);
  assert.throws(
    () => resolveClientSnapshot(profile),
    (error: Error) =>
      error.message.includes("use --snapshot ID") &&
      [first, second].every(
        ({ id, directory }) => error.message.includes(id) && error.message.includes(directory),
      ),
  );
  assert.equal(resolveClientSnapshot(profile, first.id).snapshot.directory, first.directory);
});

test("坏候选提供诊断，重复 ID 报错，旧布局和选择文件被忽略", async (testContext) => {
  const source = fixture(testContext);
  const snapshot = await importClient(source, profile.paths);
  const suffix = snapshot.id.slice(0, 12);
  const alias = path.join(clientsRoot(), `${profile.gameVersion}--${suffix}`);
  fs.cpSync(snapshot.directory, alias, { recursive: true });
  assert.throws(() => openClientSnapshot(snapshot.id), /Duplicate client snapshot ID/);
  assert.throws(() => resolveClientSnapshot(profile), /Duplicate client snapshot ID/);
  const manifest = path.join(alias, "snapshot-manifest.json");
  fs.chmodSync(manifest, 0o644);
  fs.writeFileSync(manifest, "{}");
  const { diagnostics } = resolveClientSnapshot(profile);
  assert.equal(diagnostics.length, 1);
  assert.ok(diagnostics[0].includes(path.basename(alias)));
  assert.equal(openClientSnapshot(snapshot.id).directory, snapshot.directory);
  fs.renameSync(alias, path.join(clientsRoot(), "invalid"));
  fs.renameSync(snapshot.directory, path.join(clientsRoot(), snapshot.id));
  const selections = path.join(clientsRoot(), "../selections");
  fs.mkdirSync(selections);
  writeJson(path.join(selections, "client.json"), { schemaVersion: 1, snapshotId: snapshot.id });
  assert.throws(() => resolveClientSnapshot(profile), /No client snapshot/);
  assert.throws(() => openClientSnapshot(snapshot.id), /Missing client snapshot/);
});

test("短哈希碰撞时并发导入只发布一个快照", async (testContext) => {
  const source = fixture(testContext);
  const other = path.join(path.dirname(source), "other-source");
  fs.cpSync(source, other, { recursive: true });
  fs.writeFileSync(path.join(other, "client.bin"), "different client bytes");
  const digest = hashing.digest;
  vi.spyOn(hashing, "digest").mockImplementation((value) => {
    const hash = digest(value);
    return Array.isArray(value) ? `${"a".repeat(12)}${hash.slice(12)}` : hash;
  });
  const [first, second] = await Promise.allSettled([
    importClient(source, profile.paths),
    importClient(other, profile.paths),
  ]);
  const winner = first.status === "fulfilled" ? first : second;
  const loser = first.status === "fulfilled" ? second : first;
  assert.equal(winner.status, "fulfilled");
  assert.equal(loser.status, "rejected");
  assert.match(String(loser.reason), /Client snapshot directory collision/);
  assert.ok(String(loser.reason).includes(winner.value.id));
  assert.deepEqual(fs.readdirSync(clientsRoot()), [path.basename(winner.value.directory)]);
  await winner.value.verify();
});
