import { createHash } from "node:crypto";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";
import { RecordSchema, type Catalog, type Item, type Group } from "@loomix/schema/catalog";
import type { Assets, ImageRef } from "@loomix/schema/assets";
import { emptyDataset } from "@loomix/schema/dataset";
import { documentPath } from "@loomix/schema/release";
import { referencedImages } from "@loomix/schema/dataset/images";
import type { CollectionRecord, CollectionView } from "./collection-view.ts";

export const fixtureContext = {
  formatVersion: 7,
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
    ...fixtureMetadata(),
    id: record.id,
    name: record.name,
    image: record.image === null ? null : { assetId: record.image, variant: "icon" as const },
    description: record.description,
    quality: record.quality,
  };
}
export function catalogFixture(view: Partial<CollectionView> = {}) {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  const gameplayTags = tagsFixture();
  for (const category of view.ingredientCategories ?? []) {
    gameplayTags.tags.push({
      id: category.id,
      internalName: category.tagName,
      displayName: category.name,
      enumName: null,
      parentId: category.parentId,
    });
    catalog.ingredientCategories.push({ tagId: category.id, itemIds: category.itemIds });
  }
  const add = (...items: object[]) => addFixtureRecords(catalog, gameplayTags, ...items);
  const group = (record: CollectionRecord, type: Group["type"], memberIds: number[] | null) =>
    add({ ...catalogBase(record), type, memberIds, acquisition: null });
  const common = { trade: null, acquisition: null };
  for (const record of view.furniture?.items ?? []) {
    for (const recipe of record.craftingRecipes ?? [])
      catalog.craftingRecipes.push({ ...recipe, productId: record.id, quantity: 1 });
    add({
      ...catalogBase(record),
      ...common,
      type: "furniture",
      subcategory: record.category,
      furnitureType: record.type,
      size: record.size,
      colors: values(record.colors),
      materials: values(record.materials),
      acquisition: acquisition(record.acquisition),
    });
  }
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
      acquisition: acquisition(record.acquisition),
      size: null,
      grades: null,
    });
  for (const record of view.creatures?.series ?? [])
    group(record, "creatures.series", record.creatureIds);
  for (const record of view.plants?.items ?? []) {
    add({
      ...catalogBase(record),
      ...common,
      type: "plant",
      subcategory: record.category,
      origins: values(record.originGalaxy),
      acquisition: acquisition(record.acquisition),
      flowerColors: record.flowerColors,
      drops: record.treeDrops,
      hybridRecipes: null,
    });
  }
  for (const record of view.plants?.seeds ?? []) {
    if (!catalog.growths.some((growth) => growth.id === record.growthId))
      catalog.growths.push({
        ...record.growth,
        id: record.growthId,
        stages: record.growth.stages.map((stage) => ({
          ...stage,
          image: stage.image ? { assetId: stage.image, variant: "icon" } : null,
        })),
      });
    add({
      type: "seed",
      ...catalogBase(record),
      admissionReasons: ["deterministicSeed"],
      growthId: record.growthId,
      trade: record.trade,
      acquisition: record.acquisition,
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
      acquisition: acquisition(record.acquisition),
    });
  for (const record of view.clothing?.sets ?? [])
    group(record, "clothing.set", record.componentIds);
  for (const record of view.clothing?.appearances ?? [])
    add({
      ...catalogBase(record),
      type: "appearance",
      subcategory: record.category,
      acquisition: null,
    });
  for (const record of view.miscellaneous ?? [])
    add({
      ...catalogBase(record),
      ...common,
      type: "material",
      subcategory: null,
      acquisition: acquisition(record.acquisition),
    });
  return { catalog, gameplayTags };
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
export function fixtureRequest({
  catalog,
  gameplayTags,
}: {
  catalog: Catalog;
  gameplayTags: GameplayTags;
}): typeof fetch {
  const dataset = emptyDataset(fixtureContext, fixtureSource);
  dataset.catalog = catalog;
  const documents = {
    "gameplay-tags": gameplayTags,
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

export function fixtureMetadata() {
  return {
    admissionReasons: ["manual" as const],
    clientType: 1,
    clientSecondaryType: null,
    tagIds: [] as number[],
  };
}
export function tagsFixture(): GameplayTags {
  return { ...fixtureContext, kind: "gameplay-tags", tags: [] };
}
export function addFixtureRecords(
  catalog: Catalog,
  gameplayTags: GameplayTags,
  ...items: object[]
) {
  for (const input of items) {
    const raw: Record<string, unknown> = { ...input };
    if (raw.type === "reference") {
      catalog.references.push({ id: Number(raw.id), name: String(raw.name) });
      continue;
    }
    const meta = fixtureMetadata();
    for (const [key, rootName] of [
      ["colors", "颜色"],
      ["materials", "材质"],
      ["styles", "艺术风格"],
      ["origins", "产区分类"],
      ["galaxyFlavor", "产区分类"],
    ] as const) {
      const value = raw[key];
      delete raw[key];
      const values = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split("，")
          : [];
      for (const label of values) {
        if (typeof label !== "string") continue;
        let root = gameplayTags.tags.find((tag) => tag.internalName === rootName);
        if (!root) {
          root = {
            id: Math.max(0, ...gameplayTags.tags.map((tag) => tag.id)) + 1,
            internalName: rootName,
            displayName: rootName,
            enumName: null,
            parentId: null,
          };
          gameplayTags.tags.push(root);
        }
        let tag = gameplayTags.tags.find(
          (tag) => tag.internalName === label && tag.parentId === root.id,
        );
        if (!tag) {
          tag = {
            id: Math.max(0, ...gameplayTags.tags.map((tag) => tag.id)) + 1,
            internalName: label,
            displayName: label,
            enumName: null,
            parentId: root.id,
          };
          gameplayTags.tags.push(tag);
        }
        meta.tagIds.push(tag.id);
      }
    }
    if (raw.type === "furniture") delete raw.size;
    const tagIds = Array.isArray(raw.tagIds) && raw.tagIds.length ? raw.tagIds : meta.tagIds;
    catalog.records.push(RecordSchema.parse({ ...meta, ...raw, tagIds }));
  }
}
