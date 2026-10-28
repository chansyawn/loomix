import path from "node:path";
import { readJson, writeJson } from "../../workflow/json.ts";
import { removeWithin } from "../../workflow/fs.ts";
import { exportImageAssets } from "../images/export.ts";
import { highestResolutionImages } from "../images/select.ts";
import type { SelectedImage, WorkOptions } from "../types.ts";
import { RawCollectionV5Schema } from "./build.ts";
import type { CollectionEvidence } from "./evidence.ts";

export async function exportSeedImages(options: WorkOptions): Promise<void> {
  const catalog = RawCollectionV5Schema.parse(
    readJson(path.join(options.work, "raw/content-v5.json")),
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
  for (const seed of catalog.cropSeeds) {
    const image = manifest.find((entry) => entry.id === seed.id);
    if (!image) throw new Error(`Missing selected seed image ${seed.id}`);
    seed.image = image.file;
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
  const applyStageImages = (
    growth: { stages: { id: number; image: string | null }[] | null } | null,
  ) => {
    for (const stage of growth?.stages ?? []) stage.image = stageFiles.get(stage.id) ?? null;
  };
  for (const seed of catalog.cropSeeds) applyStageImages(seed.detail.growth);
  for (const detail of catalog.details) applyStageImages(detail.growth);
  const detailById = new Map(catalog.details.map((detail) => [detail.id, detail]));
  const seedById = new Map(catalog.cropSeeds.map((seed) => [seed.id, seed.detail]));
  const updateProofs = (file: string) => {
    const proofs = readJson<CollectionEvidence[]>(path.join(options.work, file));
    const updated = proofs.map((proof) => {
      if (!proof.field.startsWith("detail.growth")) return proof;
      const detail = proof.owner === "seed" ? seedById.get(proof.id) : detailById.get(proof.id);
      if (!detail) return proof;
      let value: unknown = detail;
      for (const part of proof.field.split(".").slice(1)) {
        if (Array.isArray(value)) value = value[Number(part)];
        else if (value && typeof value === "object") value = Reflect.get(value, part);
        else return proof;
      }
      return { ...proof, value };
    });
    writeJson(path.join(options.work, file), updated);
  };
  updateProofs("collection-evidence.json");
  updateProofs("collection-missing-fields.json");
  writeJson(path.join(options.work, "seed-image-originals.json"), originals);
  writeJson(path.join(options.work, "seed-image-manifest.json"), manifest);
  writeJson(path.join(options.work, "stage-image-originals.json"), stageOriginals);
  writeJson(path.join(options.work, "stage-image-manifest.json"), stageManifest);
  writeJson(
    path.join(options.work, "raw/images-content-v5.json"),
    RawCollectionV5Schema.parse(catalog),
  );
}
