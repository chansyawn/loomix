import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "vite-plus/test";
import type { TestContext } from "vite-plus/test";
import { selectConfigSource } from "./config-source.ts";

function fixture(t: TestContext): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-config-source-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("config source selects the newest complete pair and verifies the data bundle", (t) => {
  const root = fixture(t);
  const versions = path.join(root, "Persistent/versions/5662883");
  const config = path.join(root, "Persistent/Temp/5662883/GenerateAssets");
  fs.mkdirSync(versions, { recursive: true });
  fs.mkdirSync(config, { recursive: true });
  fs.writeFileSync(path.join(root, "config.ini"), "game_version=0.95.2\n");
  fs.writeFileSync(
    path.join(versions, "data_revision.json"),
    JSON.stringify({ revision: 1449213, branch: "live_0.95" }),
  );
  fs.writeFileSync(path.join(versions, "res_revision.json"), JSON.stringify({ revision: 1391927 }));

  const rows: string[] = [];
  for (const name of ["ed.obb", "cs.obb"]) {
    const bytes = Buffer.from(name);
    fs.writeFileSync(path.join(config, name), bytes);
    rows.push(
      `GenerateAssets/${name},${crypto.createHash("md5").update(bytes).digest("hex")},${bytes.length}`,
    );
  }
  const bundle = Buffer.from("bundle");
  const bundleFile = path.join(root, "Persistent/AssetBundle/blocks/00/00000002.blk");
  fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
  fs.writeFileSync(bundleFile, bundle);
  rows.push(
    `AssetBundle/blocks/00/00000002.blk,${crypto.createHash("md5").update(bundle).digest("hex")},${bundle.length}`,
  );
  fs.writeFileSync(
    path.join(versions, "data_versions.json"),
    `FilePath,md5,FileSize\n${rows.join("\n")}\n`,
  );

  const source = selectConfigSource(root, path.join(root, "config.ini"));
  assert.equal(source.relativeDirectory, "Persistent/Temp/5662883/GenerateAssets");
  assert.ok(source.files.every((file) => file.matchesManifest));
  assert.equal(source.dataBundle.matchesManifest, true);
});

test("config source refuses a snapshot that does not match the data manifest", (t) => {
  const root = fixture(t);
  const versions = path.join(root, "Persistent/versions/5662883");
  fs.mkdirSync(versions, { recursive: true });
  fs.writeFileSync(path.join(root, "config.ini"), "game_version=0.95.2\n");
  fs.writeFileSync(
    path.join(versions, "data_revision.json"),
    JSON.stringify({ revision: 1449213, branch: "live_0.95" }),
  );
  fs.writeFileSync(path.join(versions, "res_revision.json"), JSON.stringify({ revision: 1391927 }));
  fs.writeFileSync(
    path.join(versions, "data_versions.json"),
    "FilePath,md5,FileSize\nGenerateAssets/ed.obb,0123456789abcdef0123456789abcdef,2\nGenerateAssets/cs.obb,0123456789abcdef0123456789abcdef,2\n",
  );
  assert.throws(
    () => selectConfigSource(root, path.join(root, "config.ini")),
    /No complete config pair/,
  );
});
