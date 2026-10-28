import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseCatalog } from "@loomix/content-schema";
import { parseCatalogV5 } from "@loomix/content-schema/v5";
import { RawCollectionV5Schema } from "../extraction/collection/build.ts";
import type { ImageManifest, ProcessedImage } from "../extraction/types.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { processImage } from "./image.ts";

export async function renderCollection(work: string, extraction: string): Promise<void> {
  const catalog = RawCollectionV5Schema.parse(
    readJson(path.join(extraction, "raw/images-content-v5.json")),
  );
  const base = parseCatalog(readJson(path.join(work, "staging/content.json")));
  const images = new Map(base.items.map((item) => [item.id, item.image]));
  for (const item of catalog.items) item.image = images.get(item.id) ?? null;
  const originals = readJson<ImageManifest[]>(path.join(extraction, "seed-image-manifest.json"));
  const stageOriginals = readJson<ImageManifest[]>(
    path.join(extraction, "stage-image-manifest.json"),
  );
  const manifest: ProcessedImage[] = [];
  for (const seed of catalog.cropSeeds) {
    const original = originals.find((image) => image.id === seed.id);
    if (!original) throw new Error(`Missing seed image ${seed.id}`);
    const bytes = fs.readFileSync(path.join(extraction, original.file));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== original.sha256)
      throw new Error(`Seed source hash mismatch ${seed.id}`);
    const image = await processImage(bytes, "plants.item");
    const sha256 = crypto.createHash("sha256").update(image.bytes).digest("hex");
    const file = `assets/${sha256}.webp`;
    fs.writeFileSync(path.join(work, "staging", file), image.bytes);
    seed.image = file;
    manifest.push({
      ...original,
      file,
      sha256,
      width: image.width,
      height: image.height,
      original: {
        file: original.file,
        sha256: original.sha256,
        width: original.width,
        height: original.height,
      },
    });
  }
  const stageManifest: ProcessedImage[] = [];
  const stageFiles = new Map<number, string>();
  for (const original of stageOriginals) {
    const bytes = fs.readFileSync(path.join(extraction, original.file));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== original.sha256)
      throw new Error(`Stage source hash mismatch ${original.id}`);
    const image = await processImage(bytes, "plants.item");
    const sha256 = crypto.createHash("sha256").update(image.bytes).digest("hex");
    const file = `assets/${sha256}.webp`;
    fs.writeFileSync(path.join(work, "staging", file), image.bytes);
    stageFiles.set(original.id, file);
    stageManifest.push({
      ...original,
      file,
      sha256,
      width: image.width,
      height: image.height,
      original: {
        file: original.file,
        sha256: original.sha256,
        width: original.width,
        height: original.height,
      },
    });
  }
  const applyStageImages = (
    growth: { stages: { id: number; image: string | null }[] | null } | null,
  ) => {
    for (const stage of growth?.stages ?? []) stage.image = stageFiles.get(stage.id) ?? null;
  };
  for (const seed of catalog.cropSeeds) applyStageImages(seed.detail.growth);
  for (const detail of catalog.details) applyStageImages(detail.growth);
  writeJson(path.join(work, "seed-image-manifest.json"), manifest);
  writeJson(path.join(work, "stage-image-manifest.json"), stageManifest);
  fs.copyFileSync(
    path.join(extraction, "collection-evidence.json"),
    path.join(work, "collection-evidence.json"),
  );
  writeJson(path.join(work, "staging/content.json"), parseCatalogV5(catalog));
}
