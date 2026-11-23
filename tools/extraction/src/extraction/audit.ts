import type {
  BinDataAsset,
  ConfigSource,
  SourceCheck,
  SourceAudit,
  SelectedImage,
} from "./types.ts";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { profile } from "../profile.ts";
import type { ClientSnapshot } from "../client/snapshot.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { manifestEntry, readManifestMaps } from "../client/versions.ts";

export async function audit(
  work: string,
  resolvePath: ClientSnapshot["resolvePath"],
  sourceRoot: string,
  images: readonly Pick<SelectedImage, "source">[],
) {
  const root = resolvePath(profile.paths.gameRoot);
  const manifests = readManifestMaps(root, profile.manifestId);
  const bindata = readJson<BinDataAsset[]>(path.join(sourceRoot, "bindata-manifest.json"));
  const sourceFiles = new Set([
    ...images.map((image) => image.source),
    ...bindata.map((asset) => asset.Source),
  ]);
  const records: SourceCheck[] = [];
  const configChecks: SourceAudit["configChecks"] = [];
  const configuration = readJson<ConfigSource>(
    path.join(sourceRoot, "prepared", "active-config-source.json"),
  );
  for (const selected of configuration.files) {
    const original = path.join(root, configuration.relativeDirectory, path.basename(selected.file));
    const bytes = fs.readFileSync(original);
    const expected = manifests.data.get(`GenerateAssets/${path.basename(selected.file)}`);
    const md5 = crypto.createHash("md5").update(bytes).digest("hex");
    configChecks.push({
      file: selected.file,
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
    const [, gameRoot, scope, relative] = source.match(/^([^/]+)\/([^/]+)\/(.+)$/) ?? [];
    if (
      gameRoot !== profile.paths.gameRoot ||
      !relative ||
      (scope !== "StreamingAssets" && scope !== "Persistent")
    )
      throw new Error(`Invalid package source: ${source}`);
    const expected = manifestEntry(manifests, scope, relative);
    const absolute = resolvePath(source);
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
      console.error(`  Source packages ${done}/${sourceFiles.size}`);
  }
  const report = {
    passed: [...records, ...configChecks].every((r) => r.matchesManifest),
    checkedPackages: records.length,
    records,
    configChecks,
  };
  writeJson(path.join(work, "source-audit.json"), report);
  if (!report.passed) throw new Error("Source package checksum mismatch; see source-audit.json");
}
