import path from "node:path";
import { readJson, writeJson } from "../../workflow/json.ts";
import { removeWithin } from "../../workflow/fs.ts";
import { exportImageAssets } from "../images/export.ts";
import { highestResolutionImages } from "../images/select.ts";
import type { SelectedImage, WorkOptions } from "../types.ts";
import { RawCollectionSchema } from "./build.ts";

export async function exportSeedImages(options: WorkOptions): Promise<void> {
  const catalog = RawCollectionSchema.parse(
    readJson(path.join(options.work, "raw/content-v4.json")),
  );
  const candidates = readJson<SelectedImage[]>(
    path.join(options.work, "seed-image-candidates.json"),
  );
  removeWithin(path.join(options.work, "seed-exports"), options.work);
  const originals = await exportImageAssets(options, candidates, "seed-exports");
  const selected = highestResolutionImages(candidates, originals);
  const manifest = selected.map((image) => {
    const original = originals.find(
      (entry) =>
        entry.source === image.source &&
        entry.pathId === image.pathId &&
        entry.assetType === image.assetType,
    );
    if (!original) throw new Error(`Missing seed export ${image.id}`);
    return { ...original, ...image };
  });
  for (const seed of catalog.cropSeeds) {
    const image = manifest.find((entry) => entry.id === seed.id);
    if (!image) throw new Error(`Missing selected seed image ${seed.id}`);
    seed.image = image.file;
  }
  writeJson(path.join(options.work, "seed-image-originals.json"), originals);
  writeJson(path.join(options.work, "seed-image-manifest.json"), manifest);
  writeJson(
    path.join(options.work, "raw/images-content-v4.json"),
    RawCollectionSchema.parse(catalog),
  );
}
