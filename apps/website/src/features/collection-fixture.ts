import { createHash } from "node:crypto";
import { FORMAT_VERSION } from "@loomix/schema/common";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";
import {
  CatalogSchema,
  type Acquisition,
  type Catalog,
  type Collection,
  type CollectionMemberKind,
  type Item,
} from "@loomix/schema/catalog";
import type { Assets, ImageRef } from "@loomix/schema/assets";
import { emptyDataset } from "@loomix/schema/dataset";
import { DocumentKindSchema, documentPath } from "@loomix/schema/release";
import { referencedImages } from "@loomix/schema/dataset/images";
import type { CatalogEntrySummary, CollectionView } from "./collection-view.ts";

export const fixtureContext = {
  formatVersion: FORMAT_VERSION,
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
const acquisition = (value: string | null): Acquisition[] | null =>
  value === null ? null : value.split("，").map((label, index) => ({ sourceId: index + 1, label }));

export function catalogBase(record: CatalogEntrySummary) {
  return {
    id: record.id,
    name: record.name,
    image: record.image === null ? null : { assetId: record.image, variant: "icon" as const },
    description: record.description,
    quality: record.quality,
  };
}
export type FixtureIngredientCategory = {
  id: number;
  name: string;
  tagName: string;
  parentId: number | null;
  itemIds: number[];
};

// 从网站视图形态反向构造发布目录，文本属性按需转为标签。
export function catalogFixture(
  view: Partial<CollectionView> & {
    ingredientCategories?: readonly FixtureIngredientCategory[];
  } = {},
) {
  const catalog: Catalog = { items: [], collections: [], creationCardSets: [] };
  const gameplayTags = tagsFixture();
  for (const category of view.ingredientCategories ?? [])
    gameplayTags.tags.push({
      id: category.id,
      internalName: category.tagName,
      displayName: category.name,
      parentId: category.parentId,
    });
  const add = (...items: object[]) => addFixtureRecords(catalog, gameplayTags, ...items);
  const group = (
    record: CatalogEntrySummary,
    memberKind: CollectionMemberKind,
    memberIds: number[] | null,
  ) =>
    catalog.collections.push({ ...catalogBase(record), memberKind, memberIds, acquisition: null });
  for (const record of view.furniture?.items ?? []) {
    const [width, depth] = record.size?.split("x").map(Number) ?? [];
    add({
      ...catalogBase(record),
      kind: "furniture",
      category: record.category,
      furnitureCategory: record.furnitureCategory,
      size: width && depth ? { width, depth } : null,
      colors: values(record.colors),
      materials: values(record.materials),
      acquisition: acquisition(record.acquisition),
    });
    for (const card of record.creationCards) {
      const background = card.face.background;
      if (!background) throw new Error(`Missing fixture card background ${card.id}`);
      add({
        kind: "creationCard",
        id: card.id,
        name: card.name,
        quality: card.face.quality,
        image: card.face.foreground ? { assetId: card.face.foreground, variant: "icon" } : null,
        front: { background: { assetId: background.file, variant: "card-background" } },
        cardSetId: null,
        recipe: { productId: record.id, materials: card.materials },
      });
    }
  }
  for (const record of view.furniture?.sets ?? []) group(record, "furniture", record.componentIds);
  for (const record of view.creatures?.items ?? []) {
    const range = /^(\d+(?:\.\d+)?)–(\d+(?:\.\d+)?)(.+)$/.exec(record.sizeRange ?? "");
    add({
      ...catalogBase(record),
      kind: "creature",
      category: record.category,
      region: values(record.region),
      habitat: values(record.habitat),
      activeSeasons: values(record.activeSeasons),
      activeTimes: values(record.activeTimes),
      activeWeather: values(record.activeWeather),
      scientificName: record.scientificName,
      acquisition: acquisition(record.acquisition),
      size: range ? { min: Number(range[1]), max: Number(range[2]), unit: range[3] } : null,
    });
  }
  for (const record of view.creatures?.series ?? []) group(record, "creature", record.creatureIds);
  for (const record of view.plants?.items ?? [])
    add({
      ...catalogBase(record),
      kind: "plant",
      category: record.category,
      origins: values(record.originGalaxy),
      acquisition: acquisition(record.acquisition),
      flowerColors: record.flowerColors,
      drops: record.treeDrops,
    });
  for (const record of view.plants?.seeds ?? [])
    add({
      ...catalogBase(record),
      kind: "seed",
      acquisition: record.acquisition,
      growth: {
        ...record.growth,
        stages: record.growth.stages.map((stage) => ({
          ...stage,
          image: stage.image ? { assetId: stage.image, variant: "icon" } : null,
        })),
      },
    });
  for (const record of view.plants?.series ?? []) group(record, "plant", record.plantIds);
  for (const record of view.dishes?.items ?? [])
    add({
      ...catalogBase(record),
      kind: "dish",
      origins: values(record.galaxyFlavor),
      strength: record.strength,
      effects: record.effects,
      acquisition: acquisition(record.acquisition),
      cooking: {
        difficulty: record.difficulty,
        unlockCondition: record.unlockCondition,
        cookware: record.cookware,
        tastes: record.tastes,
        slots: record.slots,
      },
    });
  for (const record of view.dishes?.series ?? []) group(record, "dish", record.dishIds);
  for (const record of view.clothing?.items ?? [])
    add({
      ...catalogBase(record),
      kind: "clothing",
      category: record.category,
      colors: values(record.colors),
      materials: values(record.materials),
      styles: values(record.styles),
      acquisition: acquisition(record.acquisition),
    });
  for (const record of view.clothing?.sets ?? []) group(record, "clothing", record.componentIds);
  for (const record of view.clothing?.appearances ?? [])
    add({ ...catalogBase(record), kind: "appearance", category: record.category });
  for (const record of view.miscellaneous ?? [])
    add({
      ...catalogBase(record),
      kind: "material",
      acquisition: acquisition(record.acquisition),
    });
  for (const category of view.ingredientCategories ?? [])
    for (const itemId of category.itemIds) {
      const item = catalog.items.find((entry) => entry.id === itemId);
      if (item && item.kind !== "reference" && !item.tagIds.includes(category.id))
        item.tagIds.push(category.id);
    }
  return { catalog: CatalogSchema.parse(catalog), gameplayTags };
}
export function assetsFixture(catalog: Catalog): Assets {
  const dataset = emptyDataset(fixtureContext, fixtureSource);
  dataset.catalog = catalog;
  return {
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
  const documents = {
    "gameplay-tags": gameplayTags,
    catalog,
    neighbors: { neighbors: [] },
    starsea: { regions: [], islands: [], iconStyles: [] },
    assets: assetsFixture(catalog),
  };
  const files = DocumentKindSchema.options.map((kind) => {
    const bytes = JSON.stringify(documents[kind]);
    return {
      kind,
      path: documentPath(kind, fixtureContext.locale),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: Buffer.byteLength(bytes),
    };
  });
  const responses = new Map(files.map((file) => [file.path, JSON.stringify(documents[file.kind])]));
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

export function tagsFixture(): GameplayTags {
  return { tags: [] };
}

const tagFacets = [
  ["colors", "颜色"],
  ["materials", "材质"],
  ["styles", "艺术风格"],
  ["origins", "产区分类"],
] as const;

function facetTag(gameplayTags: GameplayTags, rootName: string, label: string): number {
  const nextId = () => Math.max(0, ...gameplayTags.tags.map((tag) => tag.id)) + 1;
  let root = gameplayTags.tags.find((tag) => tag.internalName === rootName);
  if (!root) {
    root = { id: nextId(), internalName: rootName, displayName: rootName, parentId: null };
    gameplayTags.tags.push(root);
  }
  let tag = gameplayTags.tags.find((tag) => tag.internalName === label && tag.parentId === root.id);
  if (!tag) {
    tag = { id: nextId(), internalName: label, displayName: label, parentId: root.id };
    gameplayTags.tags.push(tag);
  }
  return tag.id;
}

// 默认补齐各种类的可空字段，并把颜色等文本属性映射为对应标签树。
const kindDefaults: Record<string, Record<string, unknown>> = {
  furniture: { category: null, furnitureCategory: null, size: null },
  creationCard: {},
  clothing: { category: null },
  appearance: { category: null },
  creature: {
    category: null,
    scientificName: null,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    size: null,
  },
  plant: { category: null, flowerColors: null, drops: null },
  dish: { strength: null, effects: null, cooking: null },
  material: {},
  seed: {},
  neighborClothing: {
    category: null,
    neighborId: null,
    playerItemId: null,
    bodyTypes: ["medium"],
    price: null,
  },
};

export function addFixtureRecords(
  catalog: Catalog,
  gameplayTags: GameplayTags,
  ...items: object[]
) {
  for (const input of items) {
    const raw: Record<string, unknown> = { ...input };
    if (raw.kind === "reference") {
      catalog.items.push({
        kind: "reference",
        id: Number(raw.id),
        name: String(raw.name),
        description: null,
      });
      continue;
    }
    if ("memberKind" in raw) {
      catalog.collections.push({
        description: null,
        image: null,
        quality: null,
        acquisition: null,
        memberIds: null,
        ...raw,
      } as Collection);
      continue;
    }
    const tagIds = new Set(Array.isArray(raw.tagIds) ? (raw.tagIds as number[]) : []);
    for (const [key, rootName] of tagFacets) {
      const value = raw[key];
      delete raw[key];
      const labels = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? value.split("，")
          : [];
      for (const label of labels)
        if (typeof label === "string") tagIds.add(facetTag(gameplayTags, rootName, label));
    }
    catalog.items.push({
      description: null,
      image: null,
      quality: null,
      acquisition: null,
      ...kindDefaults[String(raw.kind)],
      ...raw,
      tagIds: [...tagIds],
    } as Item);
  }
}
