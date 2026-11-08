import path from "node:path";
import { readJson, writeJson } from "../../workflow/json.ts";
import { removeWithin } from "../../workflow/fs.ts";
import { exportImageAssets } from "../images/export.ts";
import { highestResolutionImages } from "../images/select.ts";
import type { SelectedImage, WorkOptions } from "../types.ts";
import { RawCollectionObservationsSchema } from "./build.ts";

export async function exportSeedImages(options: WorkOptions): Promise<void> {
  const catalog = RawCollectionObservationsSchema.parse(
    readJson(path.join(options.work, "raw/catalog-observations.json")),
  );
  const candidates = readJson<SelectedImage[]>(
    path.join(options.work, "seed-image-candidates.json"),
  );
  const stageCandidates = readJson<SelectedImage[]>(
    path.join(options.work, "stage-image-candidates.json"),
  );
  removeWithin(path.join(options.work, "seed-exports"), options.work);
  removeWithin(path.join(options.work, "stage-exports"), options.work);
  const originals = await exportImageAssets(options, candidates, "seed-exports");
  const stageOriginals = await exportImageAssets(options, stageCandidates, "stage-exports");
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
  for (const seed of catalog.seeds) {
    const image = manifest.find((entry) => entry.id === seed.id);
    seed.image = image?.file ?? null;
  }
  const stageSelected = highestResolutionImages(stageCandidates, stageOriginals);
  const stageManifest = stageSelected.map((image) => {
    const original = stageOriginals.find(
      (entry) =>
        entry.source === image.source &&
        entry.pathId === image.pathId &&
        entry.assetType === image.assetType,
    );
    if (!original) throw new Error(`Missing stage export ${image.id}`);
    return { ...original, ...image };
  });
  const stageFiles = new Map(stageManifest.map((image) => [image.id, image.file]));
  for (const growth of catalog.growths)
    for (const stage of growth.stages) stage.image = stageFiles.get(stage.id) ?? null;
  writeJson(path.join(options.work, "seed-image-originals.json"), originals);
  writeJson(path.join(options.work, "seed-image-manifest.json"), manifest);
  writeJson(path.join(options.work, "stage-image-originals.json"), stageOriginals);
  writeJson(path.join(options.work, "stage-image-manifest.json"), stageManifest);
  writeJson(
    path.join(options.work, "raw/images-catalog-observations.json"),
    RawCollectionObservationsSchema.parse(catalog),
  );
}
