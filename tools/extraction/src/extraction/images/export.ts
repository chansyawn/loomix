import type { WorkOptions, SelectedImage, EvidenceRecord } from "../types.ts";
import type { Catalog } from "@loomix/schema/extraction";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { profile } from "../../profile.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { removeWithin } from "../../workflow/fs.ts";
import { exportAssets } from "../../client/anime-studio/index.ts";
import { assetKey, highestResolutionImages } from "./select.ts";

export type ImageAsset = Omit<SelectedImage, "id" | "group">;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function imageBatches<T extends ImageAsset>(selected: T[]) {
  const unique = new Map(selected.map((asset) => [assetKey(asset), asset]));
  const byPackage = new Map<string, T[]>();
  for (const a of unique.values()) {
    const key = `${a.source}|${a.assetType}`;
    if (!byPackage.has(key)) byPackage.set(key, []);
    byPackage.get(key)!.push(a);
  }
  const batches: T[][] = [];
  for (const assets of byPackage.values()) {
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(a.resourceName, (counts.get(a.resourceName) ?? 0) + 1);
    const normal = assets.filter((a) => counts.get(a.resourceName) === 1);
    if (normal.length) batches.push(normal);
    // 同名素材需分开导出，因为 AnimeStudio 导出的文件名不包含容器信息。
    for (const a of assets.filter((a) => counts.get(a.resourceName)! > 1)) batches.push([a]);
  }
  return batches;
}

export async function exportImageAssets<T extends ImageAsset>(
  options: WorkOptions,
  candidates: T[],
  directory: string,
  extract = exportAssets,
): Promise<(T & { file: string; sha256: string; width: number; height: number })[]> {
  const batches = imageBatches(candidates);
  const manifest: (T & { file: string; sha256: string; width: number; height: number })[] = [];
  let done = 0;
  for (const batch of batches) {
    const key = crypto
      .createHash("sha256")
      .update(JSON.stringify(batch))
      .digest("hex")
      .slice(0, 24);
    const exported = path.join(options.work, directory, key),
      { source, assetType } = batch[0];
    removeWithin(exported, options.work);
    await extract({
      input: source,
      output: exported,
      game: profile.animeGame,
      types: [assetType],
      names: [`^(?:${[...new Set(batch.map((a) => a.resourceName))].map(escapeRegex).join("|")})$`],
      containers: [
        `^(?:${[...new Set(batch.map((a) => a.container))].map(escapeRegex).join("|")})$`,
      ],
      logFile: path.join(options.work, "logs", `assets-${key}.log`),
    });
    for (const a of batch) {
      const file = path.join(exported, assetType, `${a.resourceName}.png`);
      if (!fs.existsSync(file)) throw new Error(`Selected image was not exported: ${a.reference}`);
      const bytes = fs.readFileSync(file),
        png = PNG.sync.read(bytes, { checkCRC: true });
      if (!png.width || !png.height || png.data.length !== png.width * png.height * 4)
        throw new Error(`Invalid complete PNG: ${a.reference}`);
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      const relative = path.relative(options.work, file).split(path.sep).join("/");
      const record = { ...a, file: relative, sha256, width: png.width, height: png.height };
      manifest.push(record);
    }
    done++;
    if (done % 5 === 0 || done === batches.length)
      console.log(`  Image batches ${done}/${batches.length}`);
  }
  return manifest;
}

export async function exportImages(options: WorkOptions, extract = exportAssets) {
  const candidates = readJson<SelectedImage[]>(path.join(options.work, "candidate-images.json"));
  removeWithin(path.join(options.work, "exports"), options.work);
  fs.mkdirSync(path.join(options.work, "exports"), { recursive: true });
  const staging = path.join(options.work, "raw"),
    destination = path.join(staging, "assets");
  const content = readJson<Catalog>(path.join(staging, "content.json"));
  removeWithin(destination, staging);
  fs.mkdirSync(destination, { recursive: true });

  const manifest = await exportImageAssets(options, candidates, "exports", extract);
  writeJson(path.join(options.work, "image-candidates.json"), manifest);
  const selected = highestResolutionImages(candidates, manifest);
  const byKey = new Map(manifest.map((entry) => [assetKey(entry), entry]));
  const selectedManifest = selected.map((asset) => ({
    ...byKey.get(assetKey(asset))!,
    ...asset,
  }));
  const imageByRecord = new Map(selectedManifest.map((entry) => [entry.id, entry]));
  writeJson(path.join(options.work, "selected-images.json"), selected);
  writeJson(path.join(options.work, "image-manifest.json"), selectedManifest);
  const evidence = readJson<EvidenceRecord[]>(
    path.join(options.work, "field-evidence.json"),
  ).filter((p) => p.field !== "image");
  for (const a of selected) {
    const record = content.items.find((r) => r.id === a.id);
    const image = imageByRecord.get(a.id)?.file;
    if (!record || !image) throw new Error(`No exported image for ${a.id}`);
    record.image = image;
    evidence.push({
      id: a.id,
      group: a.group,
      field: "image",
      value: record.image,
      evidence: {
        reference: a.reference,
        container: a.container,
        source: a.source,
        pathId: a.pathId,
      },
    });
  }
  writeJson(path.join(options.work, "image-field-evidence.json"), evidence);
  writeJson(path.join(staging, "images-content.json"), content);
  console.log(
    `Compared ${manifest.length} indexed assets; selected ${selectedManifest.length} assets, ${manifest.length} raw image objects`,
  );
}
