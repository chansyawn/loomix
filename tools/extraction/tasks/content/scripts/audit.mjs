import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { profile, repoRoot } from "./config.mjs";
import { readJson, writeJson } from "./io.mjs";

function manifestAt(file) {
  return new Map(
    fs
      .readFileSync(file, "utf8")
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const [name, md5, size] = line.split(",");
        return [name, { md5, size: Number(size) }];
      }),
  );
}

export async function audit(options) {
  const root = path.resolve(repoRoot, profile.paths.gameRoot);
  const base = manifestAt(path.join(root, "StreamingAssets/res_versions.json"));
  const patch = manifestAt(
    path.join(root, `Persistent/versions/${profile.manifestId}/res_versions.json`),
  );
  const data = manifestAt(
    path.join(root, `Persistent/versions/${profile.manifestId}/data_versions.json`),
  );
  const images = readJson(path.join(options.work, "image-manifest.json"));
  const bindata = readJson(path.join(options.work, "bindata-manifest.json"));
  const sourceFiles = new Set([...images.map((a) => a.source), ...bindata.map((a) => a.Source)]);
  const records = [];
  const configChecks = [];
  const configuration = readJson(path.join(options.work, "prepared", "active-config-source.json"));
  for (const selected of configuration.files) {
    const bytes = fs.readFileSync(selected.file);
    const expected = data.get(`GenerateAssets/${path.basename(selected.file)}`);
    const md5 = crypto.createHash("md5").update(bytes).digest("hex");
    configChecks.push({
      file: selected.file,
      md5,
      size: bytes.length,
      matchesManifest:
        !!expected &&
        expected.md5 === md5 &&
        expected.size === bytes.length &&
        selected.md5 === md5,
    });
  }
  let done = 0;
  for (const source of sourceFiles) {
    const [, scope, relative] =
      source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(StreamingAssets|Persistent)\/(.*)$/) ??
      [];
    if (!relative) throw new Error(`Invalid package source: ${source}`);
    const expected =
      scope === "Persistent" ? (data.get(relative) ?? patch.get(relative)) : base.get(relative);
    const hash = crypto.createHash("md5");
    for await (const bytes of fs.createReadStream(source)) hash.update(bytes);
    const md5 = hash.digest("hex"),
      size = fs.statSync(source).size;
    records.push({
      source,
      md5,
      size,
      expected,
      matchesManifest: !!expected && expected.md5 === md5 && expected.size === size,
    });
    done++;
    if (done % 20 === 0 || done === sourceFiles.size)
      console.log(`  Source packages ${done}/${sourceFiles.size}`);
  }
  const report = {
    passed: [...records, ...configChecks].every((r) => r.matchesManifest),
    checkedPackages: records.length,
    records,
    configChecks,
  };
  writeJson(path.join(options.work, "source-audit.json"), report);
  if (!report.passed) throw new Error("Source package checksum mismatch; see source-audit.json");
}
