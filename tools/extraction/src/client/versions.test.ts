import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import type { TestContext } from "vite-plus/test";
import {
  manifestEntry,
  parseVersionManifest,
  readClientVersion,
  readManifestMaps,
} from "./versions.ts";

function fixture(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-versions-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("version manifests reject unsafe paths and duplicate entries", () => {
  const row = "AssetBundle/a.blk,0123456789abcdef0123456789abcdef,12";
  assert.deepEqual(parseVersionManifest(`FilePath,md5,FileSize\n${row}\n`), [
    { path: "AssetBundle/a.blk", md5: "0123456789abcdef0123456789abcdef", bytes: 12 },
  ]);
  for (const text of [
    "bad header",
    `FilePath,md5,FileSize\n${row}\n${row}\n`,
    `FilePath,md5,FileSize\n../${row}\n`,
    `FilePath,md5,FileSize\n${row.replace(",12", ",-1")}\n`,
  ])
    assert.throws(() => parseVersionManifest(text), /Invalid/);
});

test("data manifests override matching resource-update entries", (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, "StreamingAssets"));
  fs.mkdirSync(path.join(root, "Persistent/versions/1"), { recursive: true });
  const base = "base.blk,0123456789abcdef0123456789abcdef,1\n";
  fs.writeFileSync(
    path.join(root, "StreamingAssets/res_versions.json"),
    `FilePath,md5,FileSize\n${base}`,
  );
  fs.writeFileSync(
    path.join(root, "Persistent/versions/1/res_versions.json"),
    "FilePath,md5,FileSize\nshared.blk,0123456789abcdef0123456789abcdef,2\n",
  );
  fs.writeFileSync(
    path.join(root, "Persistent/versions/1/data_versions.json"),
    "FilePath,md5,FileSize\nshared.blk,fedcba9876543210fedcba9876543210,3\n",
  );
  const maps = readManifestMaps(root, "1");
  assert.equal(manifestEntry(maps, "StreamingAssets", "base.blk")?.bytes, 1);
  assert.equal(
    manifestEntry(maps, "Persistent", "shared.blk")?.md5,
    "fedcba9876543210fedcba9876543210",
  );
});

test("client version and revisions are read from the snapshot", (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, "config.ini"), "game_version=0.95.2\n");
  fs.mkdirSync(path.join(root, "versions"));
  fs.writeFileSync(
    path.join(root, "versions/data_revision.json"),
    JSON.stringify({ revision: 1449213, branch: "live_0.95" }),
  );
  fs.writeFileSync(
    path.join(root, "versions/res_revision.json"),
    JSON.stringify({ revision: 1391927 }),
  );
  assert.equal(readClientVersion(path.join(root, "config.ini")), "0.95.2");
});
