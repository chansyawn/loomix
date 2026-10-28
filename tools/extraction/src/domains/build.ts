import { writeDomainEvidence } from "./evidence.ts";
import path from "node:path";
import { parseDataset } from "@loomix/schema/dataset";
import { referencedImages } from "@loomix/schema/dataset/images";
import { imageKey } from "@loomix/schema/assets";
import { RawCollectionObservationsSchema } from "../extraction/collection/build.ts";
import { parseNeighborDatabase } from "@loomix/schema/extraction/neighbor";
import { parseIslandDatabase } from "@loomix/schema/extraction/islands";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { parseWorld } from "@loomix/schema/world";
import type {
  NeighborImageExport,
  AdditionalNeighborImageExport,
} from "../extraction/neighbors/images.ts";
import type { IslandImageExport } from "../extraction/islands/images.ts";
import type { ImageManifest } from "../extraction/types.ts";
import { createContentContext } from "../extraction/content/context.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { createAssetRegistry } from "./assets.ts";
import { buildCatalog } from "./catalog.ts";

function localizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(localizeKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key === "npcId"
        ? "neighborId"
        : key === "bodyZh" || key === "textZh"
          ? "text"
          : key.endsWith("Zh")
            ? key.slice(0, -2)
            : key,
      localizeKeys(entry),
    ]),
  );
}

export function buildDataset(work: string) {
  const identity = { formatVersion: 1, snapshotId: path.basename(work), locale: "zh-CN" } as const;
  const observations = RawCollectionObservationsSchema.parse(
    readJson(path.join(work, "raw/images-catalog-observations.json")),
  );
  const neighbors = parseNeighborDatabase(readJson(path.join(work, "raw/neighbors.json")));
  const islands = parseIslandDatabase(readJson(path.join(work, "raw/islands.json")));
  const assets = createAssetRegistry();
  for (const file of [
    "image-manifest.json",
    "seed-image-manifest.json",
    "stage-image-manifest.json",
  ])
    for (const image of readJson<ImageManifest[]>(path.join(work, file)))
      assets.register(image, image.group);
  const neighborImages = new Map(
    readJson<NeighborImageExport[]>(path.join(work, "neighbor-image-exports.json")).map((image) => [
      image.reference,
      assets.register(image),
    ]),
  );
  const islandImages = new Map(
    readJson<IslandImageExport[]>(path.join(work, "island-image-exports.json")).map((image) => [
      image.reference,
      assets.register(image),
    ]),
  );
  const additionalImages = readJson<AdditionalNeighborImageExport[]>(
    path.join(work, "neighbor-additional-image-exports.json"),
  ).map((image) => ({
    key: image.resourceName,
    category: image.category,
    neighborId: image.npcId,
    image: assets.register(image),
  }));
  const neighborImage = (reference: string | null) =>
    reference === null ? null : (neighborImages.get(reference) ?? null);
  const islandImage = (reference: string | null) =>
    reference === null ? null : (islandImages.get(reference) ?? null);
  const {
    schemaVersion: _neighborVersion,
    source: _neighborSource,
    encounterIslands,
    assets: resources,
    ...neighborData
  } = neighbors;
  const roster = neighborData.neighbors.map(
    ({
      starKeys: _stars,
      storyKeys: _stories,
      furnishingThemeIds: _themeIds,
      furnishingThemeKeys: _themeKeys,
      rewardItemIds: _rewards,
      assetPaths: _paths,
      avatarPath,
      ...neighbor
    }) => ({ ...neighbor, avatar: neighborImage(avatarPath) }),
  );
  const publicNeighbors = parseNeighbors({
    ...identity,
    kind: "neighbors",
    ...(localizeKeys({
      ...neighborData,
      neighbors: roster,
      stars: neighborData.stars.map(({ illustrationPath, ...star }) => ({
        ...star,
        image: neighborImage(illustrationPath),
      })),
      stories: neighborData.stories.map((story) => ({
        ...story,
        paragraphs: story.paragraphs.map(({ illustrationPath, ...paragraph }) => ({
          ...paragraph,
          image: neighborImage(illustrationPath),
        })),
      })),
      furnishingThemes: neighborData.furnishingThemes.map(({ coverPath, ...theme }) => ({
        ...theme,
        cover: neighborImage(coverPath),
      })),
    }) as object),
    rewards: neighborData.rewards.map((reward) => ({
      itemId: reward.itemId,
      sources: reward.sources,
      relatedNeighborIds: reward.relatedNeighborIds,
    })),
    resources,
    additionalImages,
  });
  const encounters = new Map(encounterIslands.map((island) => [island.id, island]));
  const publicWorld = parseWorld({
    ...identity,
    kind: "world",
    islands: islands.islands.map(({ nameZh, illustrationPath, ...island }) => ({
      ...island,
      name: nameZh,
      image: islandImage(illustrationPath),
      neighborIds: encounters.get(island.id)?.neighborIds ?? [],
      unlockCondition: encounters.get(island.id)?.unlockCondition ?? null,
    })),
    islandIconStyles: islands.islandIconStyles.map(
      ({ nameZh, iconPath, variantIconPath, ...style }) => ({
        ...style,
        name: nameZh,
        icon: islandImage(iconPath),
        variantIcon: islandImage(variantIconPath),
      }),
    ),
    regions: islands.regions.map(({ nameZh, sdfPath, stationImagePath, ...region }) => ({
      ...region,
      name: nameZh,
      sdf: islandImage(sdfPath),
      stationImage: islandImage(stationImagePath),
    })),
  });
  const dataset = parseDataset({
    context: identity,
    source: neighbors.source,
    catalog: buildCatalog(observations, createContentContext(work), assets, identity),
    neighbors: publicNeighbors,
    world: publicWorld,
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
