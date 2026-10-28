import { createHash } from "node:crypto";
import type { Catalog, Item, Group } from "@loomix/schema/catalog";
import type { Assets, ImageRef } from "@loomix/schema/assets";
import { emptyDataset } from "@loomix/schema/dataset";
import { documentPath } from "@loomix/schema/release";
import { referencedImages } from "@loomix/schema/dataset/images";
import type { CollectionRecord, CollectionView } from "./collection-view.ts";

export const fixtureContext = {
  formatVersion: 1,
  snapshotId: "a".repeat(64),
  locale: "zh-CN",
} as const;
export const fixtureSource = {
  gameVersion: "0.95.2",
  dataRevision: 1449213,
  resourceRevision: 1391927,
  manifestId: "5662883",
};
const values = (value: string | null): string[] | null => value?.split("，") ?? null;
type MaterialItem = Extract<Item, { type: "material" }>;
const acquisition = (value: string | null): MaterialItem["acquisition"] =>
  value === null
    ? null
    : value.split("，").map((label, index) => ({
        sourceId: index + 1,
        label,
        condition: null,
      }));
export function catalogBase(record: CollectionRecord) {
  return {
    id: record.id,
    name: record.name,
    image: record.image === null ? null : { assetId: record.image, variant: "icon" as const },
    description: record.description,
    quality: record.quality,
  };
}
export function catalogFixture(view: Partial<CollectionView> = {}): Catalog {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  catalog.ingredientCategories = view.ingredientCategories ?? [];
  const add = (item: Item) => {
    catalog.items.push(item);
    catalog.entries.push({ entity: { kind: "item", id: item.id }, encyclopedia: { listed: true } });
  };
  const group = (record: CollectionRecord, type: Group["type"], memberIds: number[] | null) => {
    catalog.groups.push({ ...catalogBase(record), type, memberIds });
    catalog.entries.push({
      entity: { kind: "group", id: record.id },
      encyclopedia: { listed: true },
    });
  };
  const common = { trade: null, acquisition: null };
  for (const record of view.furniture?.items ?? [])
    add({
      ...catalogBase(record),
      ...common,
      type: "furniture",
      subcategory: record.category,
      furnitureType: record.type,
      size: record.size,
      colors: values(record.colors),
      materials: values(record.materials),
      sources: values(record.sources),
      craftingRecipes: record.craftingRecipes,
    });
  for (const record of view.furniture?.sets ?? [])
    group(record, "furniture.set", record.componentIds);
  for (const record of view.creatures?.items ?? [])
    add({
      ...catalogBase(record),
      ...common,
      type: "creature",
      subcategory: record.category,
      region: values(record.region),
      habitat: values(record.habitat),
      activeSeasons: values(record.activeSeasons),
      activeTimes: values(record.activeTimes),
      activeWeather: values(record.activeWeather),
      sizeRange: record.sizeRange,
      scientificName: record.scientificName,
      sources: values(record.sources),
      size: null,
      grades: null,
    });
  for (const record of view.creatures?.series ?? [])
    group(record, "creatures.series", record.creatureIds);
  for (const record of view.plants?.items ?? []) {
    const growthId = record.growth ? (record.seedId ?? record.id) : null;
    if (
      record.growth &&
      growthId !== null &&
      !catalog.growths.some((growth) => growth.id === growthId)
    )
      catalog.growths.push({
        ...record.growth,
        id: growthId,
        stages:
          record.growth.stages?.map((stage) => ({
            ...stage,
            image: stage.image ? { assetId: stage.image, variant: "icon" } : null,
          })) ?? null,
      });
    add({
      ...catalogBase(record),
      ...common,
      type: "plant",
      subcategory: record.category,
      origins: values(record.originGalaxy),
      maturityPeriod: record.maturityPeriod,
      harvestCount: record.harvestCount,
      sources: values(record.sources),
      flowerColors: record.flowerColors,
      growthId,
      drops: record.treeDrops,
      hybridRecipes: null,
    });
  }
  for (const record of view.plants?.series ?? []) group(record, "plants.series", record.plantIds);
  for (const record of view.dishes?.items ?? [])
    add({
      ...catalogBase(record),
      ...common,
      type: "dish",
      subcategory: null,
      difficulty: record.difficulty,
      galaxyFlavor: record.galaxyFlavor,
      cookware: values(record.cookware),
      effectsText: record.effectsText,
      recipe: record.recipe,
      sources: values(record.acquisition),
      acquisition: acquisition(record.acquisition),
      tastes: record.tastes,
      difficultyRequirement: record.difficultyRequirement,
      effects: record.effects,
    });
  for (const record of view.dishes?.series ?? []) group(record, "dishes.series", record.dishIds);
  for (const record of view.clothing?.items ?? [])
    add({
      ...catalogBase(record),
      ...common,
      type: "clothing",
      subcategory: record.category,
      colors: values(record.colors),
      materials: values(record.materials),
      styles: values(record.styles),
      sources: values(record.sources),
    });
  for (const record of view.clothing?.sets ?? [])
    group(record, "clothing.set", record.componentIds);
  for (const record of view.clothing?.appearances ?? []) {
    catalog.appearances.push({ ...catalogBase(record), subcategory: record.category });
    catalog.entries.push({
      entity: { kind: "appearance", id: record.id },
      encyclopedia: { listed: false },
    });
  }
  for (const record of view.miscellaneous ?? [])
    add({
      ...catalogBase(record),
      ...common,
      type: "material",
      subcategory: null,
      acquisition: acquisition(record.acquisition),
      sources: null,
    });
  return catalog;
}
export function assetsFixture(catalog: Catalog): Assets {
  const dataset = emptyDataset(fixtureContext, fixtureSource);
  dataset.catalog = catalog;
  return {
    ...fixtureContext,
    kind: "assets",
    images: referencedImages(dataset).map((image: ImageRef) => ({
      ...image,
      file: image.assetId,
      sha256: image.assetId.match(/[a-f0-9]{64}/)?.[0] ?? "a".repeat(64),
      bytes: 1,
      width: 256,
      height: 256,
    })),
  };
}
export function fixtureRequest(catalog: Catalog): typeof fetch {
  const dataset = emptyDataset(fixtureContext, fixtureSource);
  dataset.catalog = catalog;
  const documents = {
    catalog,
    neighbors: dataset.neighbors,
    world: dataset.world,
    assets: assetsFixture(catalog),
  };
  const files = Object.entries(documents).map(([kind, data]) => {
    const bytes = JSON.stringify(data);
    return {
      kind,
      path: documentPath(kind as keyof typeof documents, fixtureContext.locale),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: Buffer.byteLength(bytes),
    };
  });
  const responses = new Map(
    files.map((file) => [
      file.path,
      JSON.stringify(documents[file.kind as keyof typeof documents]),
    ]),
  );
  responses.set(
    "release.json",
    JSON.stringify({ ...fixtureContext, source: fixtureSource, files }),
  );
  return (input) => {
    const url = input instanceof Request ? input.url : String(input);
    const entry = [...responses].find(([key]) => url.endsWith(key));
    return Promise.resolve(new Response(entry?.[1] ?? "missing", { status: entry ? 200 : 404 }));
  };
}
