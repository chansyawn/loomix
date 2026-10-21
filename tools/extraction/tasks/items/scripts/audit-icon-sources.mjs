import { getPaths, profile } from "./config.mjs";
import fs from "node:fs";
import crypto from "node:crypto";
const { gameRoot: root, out: output } = getPaths(),
  out = `${output}/catalog`;
function readManifest(file) {
  return new Map(
    fs
      .readFileSync(file, "utf8")
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const [file, md5, size] = line.split(",");
        return [file, { md5, size: Number(size) }];
      }),
  );
}
const base = readManifest(`${root}/StreamingAssets/res_versions.json`);
const patch = readManifest(`${root}/Persistent/versions/${profile.manifestId}/res_versions.json`);
const data = readManifest(`${root}/Persistent/versions/${profile.manifestId}/data_versions.json`);
const manifest = JSON.parse(fs.readFileSync(`${out}/icon-manifest.json`));
const records = [];
for (const source of new Set(manifest.map((i) => i.source))) {
  const [, scope, relative] =
    source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(StreamingAssets|Persistent)\/(.*)$/) ??
    [];
  if (!relative) throw new Error(`Unrecognized source ${source}`);
  const expected =
    scope === "Persistent" ? (data.get(relative) ?? patch.get(relative)) : base.get(relative);
  const hash = crypto.createHash("md5");
  for await (const chunk of fs.createReadStream(source)) hash.update(chunk);
  const md5 = hash.digest("hex"),
    size = fs.statSync(source).size;
  records.push({
    source,
    scope,
    size,
    md5,
    expected: expected ?? null,
    matchesManifest: !!expected && md5 === expected.md5 && size === expected.size,
  });
}
const result = {
  passed: records.every((r) => r.matchesManifest),
  checkedBundles: records.length,
  matchedBundles: records.filter((r) => r.matchesManifest).length,
  records,
};
fs.writeFileSync(`${out}/icon-source-audit.json`, JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({ ...result, records: records.filter((r) => !r.matchesManifest) }, null, 2),
);
if (!result.passed) process.exitCode = 1;
