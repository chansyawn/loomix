import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { parseResourceManifest } from "./resource-audit.ts";

test("resource manifests reject traversal, duplicates and invalid metadata", () => {
  const row = "AssetBundle/a.blk,0123456789abcdef0123456789abcdef,12";
  assert.deepEqual(parseResourceManifest(`FilePath,md5,FileSize\r\n${row}\r\n`), [
    { path: "AssetBundle/a.blk", md5: "0123456789abcdef0123456789abcdef", bytes: 12 },
  ]);
  for (const text of [
    "bad header",
    `FilePath,md5,FileSize\n${row}\n${row}`,
    `FilePath,md5,FileSize\n../${row}`,
    `FilePath,md5,FileSize\n${row.replace(",12", ",-1")}`,
    `FilePath,md5,FileSize\n${row.replace("0123456789abcdef0123456789abcdef", "invalid")}`,
  ])
    assert.throws(() => parseResourceManifest(text), /Invalid/);
});

test("data manifest overrides resource metadata for the same installed package", async (t) => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { createHash } = await import("node:crypto");
  const { validateResourceManifests } = await import("./resource-audit.ts");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "loomix-resource-manifest-"));
  t.onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "StreamingAssets"));
  fs.mkdirSync(path.join(root, "Persistent/versions/1"), { recursive: true });
  fs.writeFileSync(path.join(root, "StreamingAssets/res_versions.json"), "FilePath,md5,FileSize\n");
  const current = "current data";
  const md5 = createHash("md5").update(current).digest("hex");
  fs.writeFileSync(path.join(root, "Persistent/package.blk"), current);
  fs.writeFileSync(
    path.join(root, "Persistent/versions/1/res_versions.json"),
    "FilePath,md5,FileSize\npackage.blk,00000000000000000000000000000000,1\n",
  );
  fs.writeFileSync(
    path.join(root, "Persistent/versions/1/data_versions.json"),
    `FilePath,md5,FileSize\npackage.blk,${md5},${current.length}\n`,
  );
  const reports = await validateResourceManifests(root, "1");
  assert.equal(reports[2].checked, 1);
  fs.writeFileSync(path.join(root, "Persistent/package.blk"), "corrupt");
  await assert.rejects(validateResourceManifests(root, "1"), /checksum mismatch/);
});
