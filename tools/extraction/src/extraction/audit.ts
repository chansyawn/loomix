import type {
  WorkOptions,
  ImageManifest,
  BinDataAsset,
  ConfigSource,
  SourceCheck,
  SourceAudit,
} from "./types.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { profile } from "../profile.ts";
import { repoRoot } from "../paths.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { manifestEntry, readManifestMaps } from "../client/versions.ts";

export async function audit(options: WorkOptions) {
  const root = path.resolve(repoRoot, profile.paths.gameRoot);
  const manifests = readManifestMaps(root, profile.manifestId);
  const images = readJson<ImageManifest[]>(path.join(options.work, "image-candidates.json"));
  const bindata = readJson<BinDataAsset[]>(path.join(options.work, "bindata-manifest.json"));
  const neighborImages = readJson<{ source: string }[]>(
    path.join(options.work, "neighbor-image-exports.json"),
  );
  const additionalNeighborImages = readJson<{ source: string }[]>(
    path.join(options.work, "neighbor-additional-image-exports.json"),
  );
  const islandImageExports = fs.existsSync(path.join(options.work, "island-image-exports.json"))
    ? readJson<{ source: string }[]>(path.join(options.work, "island-image-exports.json"))
    : [];
  const sourceFiles = new Set([
    ...readJson<ImageManifest[]>(path.join(options.work, "seed-image-originals.json")).map(
      (image) => image.source,
    ),
    ...images.map((a) => a.source),
    ...neighborImages.map((a) => a.source),
    ...additionalNeighborImages.map((a) => a.source),
    ...islandImageExports.map((image) => image.source),
    ...bindata.map((a) => a.Source),
  ]);
  const records: SourceCheck[] = [];
  const configChecks: SourceAudit["configChecks"] = [];
  const configuration = readJson<ConfigSource>(
    path.join(options.work, "prepared", "active-config-source.json"),
  );
  for (const selected of configuration.files) {
    const original = path.join(root, configuration.relativeDirectory, path.basename(selected.file));
    const bytes = fs.readFileSync(original);
    const expected = manifests.data.get(`GenerateAssets/${path.basename(selected.file)}`);
    const md5 = crypto.createHash("md5").update(bytes).digest("hex");
    configChecks.push({
      file: original,
      md5,
      size: bytes.length,
      matchesManifest:
        !!expected &&
        expected.md5 === md5 &&
        expected.bytes === bytes.length &&
        selected.md5 === md5,
    });
  }
  let done = 0;
  for (const source of sourceFiles) {
    const [, scope, relative] =
      source.replaceAll("\\", "/").match(/PetitPlanet_Data\/(StreamingAssets|Persistent)\/(.*)$/) ??
      [];
    if (!relative || (scope !== "StreamingAssets" && scope !== "Persistent"))
      throw new Error(`Invalid package source: ${source}`);
    const expected = manifestEntry(manifests, scope, relative);
    const absolute = path.resolve(repoRoot, source);
    const hash = crypto.createHash("md5");
    for await (const bytes of fs.createReadStream(absolute)) hash.update(bytes);
    const md5 = hash.digest("hex"),
      size = fs.statSync(absolute).size;
    records.push({
      source,
      expected,
      md5,
      size,
      matchesManifest: !!expected && expected.md5 === md5 && expected.bytes === size,
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
