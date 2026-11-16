import { writeDomainEvidence } from "./evidence.ts";
import path from "node:path";
import { parseDataset } from "@loomix/schema/dataset";
import type { Dataset } from "@loomix/schema/dataset";
import { referencedImages } from "@loomix/schema/dataset/images";
import { imageKey } from "@loomix/schema/assets";
import { RawCollectionObservationsSchema } from "../extraction/collection/build.ts";
import {
  parseNeighborClothingDatabase,
  parseNeighborDatabase,
} from "../extraction/neighbors/schema.ts";
import { buildNeighbors, neighborReferencedItemIds } from "./neighbors.ts";
import type {
  NeighborImageExport,
  AdditionalNeighborImageExport,
} from "../extraction/neighbors/images.ts";
import type { ImageManifest } from "../extraction/types.ts";
import { createContentContext } from "../extraction/content/context.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { createAssetRegistry } from "./assets.ts";
import { buildCatalog } from "./catalog.ts";

export const FORMAT_VERSION = 11;

export function buildDataset(work: string) {
  const context: Dataset["context"] = {
    formatVersion: FORMAT_VERSION,
    snapshotId: path.basename(work),
    locale: "zh-CN",
  };
  const observations = RawCollectionObservationsSchema.parse(
    readJson(path.join(work, "raw/images-catalog-observations.json")),
  );
  const neighbors = parseNeighborDatabase(readJson(path.join(work, "raw/neighbors.json")));
  const neighborClothing = parseNeighborClothingDatabase(
    readJson(path.join(work, "raw/neighbor-clothing.json")),
  );
  const assets = createAssetRegistry();
  for (const file of [
    "image-manifest.json",
    "seed-image-manifest.json",
    "stage-image-manifest.json",
  ])
    for (const image of readJson<ImageManifest[]>(path.join(work, file)))
      assets.register(image, image.group);
  const neighborExports = readJson<NeighborImageExport[]>(
    path.join(work, "neighbor-image-exports.json"),
  );
  const neighborImages = new Map(
    neighborExports.map((image) => [image.reference, assets.register(image)]),
  );
  const neighborClothingImages = new Map(
    neighborExports
      .filter((image) => neighborClothing.items.some((item) => item.imagePath === image.reference))
      .map((image) => [image.reference, assets.register(image, "neighborClothing")]),
  );
  const additionalImages = readJson<AdditionalNeighborImageExport[]>(
    path.join(work, "neighbor-additional-image-exports.json"),
  ).map((image) => ({
    category: image.category,
    neighborId: image.npcId,
    image: assets.register(image),
  }));
  const neighborImage = (reference: string | null) =>
    reference === null ? null : (neighborImages.get(reference) ?? null);
  const content = createContentContext(work);
  const dataset = parseDataset({
    context,
    source: neighbors.source,
    gameplayTags: {
      tags: content.gameplayTags.tags.map(({ enumName: _enumName, ...tag }) => tag),
    },
    catalog: buildCatalog({
      observations,
      context: content,
      assets,
      referencedItemIds: neighborReferencedItemIds(neighbors),
      neighborOutfits: neighborClothing.items,
      neighborImage: (reference) => neighborClothingImages.get(reference) ?? null,
    }),
    neighbors: buildNeighbors(neighbors, neighborImage, additionalImages),
  });
  const used = new Set(referencedImages(dataset).map(imageKey));
  const jobs = [...assets.jobs]
    .filter(([key]) => used.has(key))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, job]) => job);
  return { dataset, jobs };
}
export function assembleDataset(work: string): void {
  const { dataset, jobs } = buildDataset(work);
  writeDomainEvidence(work, dataset);
  writeJson(path.join(work, "dataset.json"), dataset);
  writeJson(path.join(work, "image-jobs.json"), jobs);
}
