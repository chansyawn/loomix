import { recordMetadata } from "./fixture.ts";
import { expect, test } from "vite-plus/test";
import { emptyDataset, parseDataset, validateDataset } from "../src/dataset/index.ts";
import { CatalogSchema } from "../src/catalog/index.ts";
import { parseRelease } from "../src/release/index.ts";
import { referencedImages } from "../src/dataset/images.ts";
import { parseNeighbors } from "../src/neighbors/index.ts";
const context = { formatVersion: 6, snapshotId: "a".repeat(64), locale: "zh-CN" } as const;
const source = { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" };
const base = {
  ...recordMetadata(),
  id: 1,
  name: "物品",
  image: null,
  quality: null,
  description: null,
};

test("parsing rejects unknown fields and versions without mutating the input", () => {
  const dataset = emptyDataset(context, source);
  expect(parseDataset(dataset)).toEqual(dataset);
  expect(() => CatalogSchema.parse({ ...dataset.catalog, formatVersion: 1 })).toThrow();
  expect(() => CatalogSchema.parse({ ...dataset.catalog, details: [] })).toThrow();
  expect(dataset.catalog.records).toEqual([]);
});
test("acquisition is the only item acquisition field and neighbor rewards are removed", () => {
  const dataset = emptyDataset(context, source);
  const acquisition = [
    { sourceId: 142, label: "摇晃果树或伐木后拾取获得", condition: null },
    { sourceId: 143, label: "摇晃果树或伐木后拾取获得", condition: null },
  ];
  const item = { ...base, type: "material" as const, subcategory: null, trade: null, acquisition };
  dataset.catalog.records.push(item);
  expect(parseDataset(dataset).catalog.records[0]).toEqual(item);
  expect(() =>
    CatalogSchema.parse({ ...dataset.catalog, records: [{ ...item, sources: [] }] }),
  ).toThrow();
  expect(dataset.neighbors).not.toHaveProperty("rewards");
  expect(() =>
    parseDataset({ ...dataset, neighbors: { ...dataset.neighbors, rewards: [] } }),
  ).toThrow();
});
test("reference identity is separate from formal admission", () => {
  const dataset = emptyDataset(context, source);
  dataset.catalog.references.push({ id: 1, name: "材料" });
  expect(validateDataset(dataset)).toEqual([]);
  dataset.catalog.records.push({
    ...base,
    type: "material",
    subcategory: null,
    trade: null,
    acquisition: null,
  });
  expect(
    validateDataset(dataset).some((issue) => issue.message.includes("Reference duplicates")),
  ).toBe(true);
  expect(() => CatalogSchema.parse({ ...dataset.catalog, entries: [] })).toThrow();
});
test("gift preferences reference known neighbors, items, and the shared tag dictionary", () => {
  const dataset = emptyDataset(context, source);
  dataset.neighbors.neighbors.push({
    id: 11,
    name: "蛮蛮",
    bodyType: null,
    scaleValue: null,
    avatar: null,
    npc2Path: "Avatar/NPC2/NPC_11",
  });
  dataset.catalog.references.push({ id: 50000, name: "物品" });
  dataset.neighbors.giftPreferences.push({
    key: "11:love",
    neighborId: 11,
    level: "love",
    itemIds: [50000],
    tagIds: [50000],
  });
  dataset.gameplayTags.tags.push({
    id: 50000,
    internalName: "食物",
    displayName: "食物",
    enumName: null,
    parentId: null,
  });
  expect(parseDataset(dataset).neighbors.giftPreferences).toEqual(
    dataset.neighbors.giftPreferences,
  );
  expect(
    parseNeighbors({
      ...dataset.neighbors,
      giftPreferences: undefined,
    }),
  ).toMatchObject({ giftPreferences: [] });
  dataset.neighbors.giftPreferences[0]!.tagIds = [50001];
  expect(validateDataset(dataset)).toContainEqual(
    expect.objectContaining({ message: "Unknown preference tag 50001" }),
  );
});
test("neighbor outfit data is backward-compatible and keeps configured prices distinct from availability", () => {
  const dataset = emptyDataset(context, source);
  dataset.neighbors.neighbors.push({
    id: 11,
    name: "蛮蛮",
    bodyType: null,
    scaleValue: null,
    avatar: null,
    npc2Path: "Avatar/NPC2/NPC_11",
  });
  const image = { assetId: "neighbor-outfit-icon", variant: "icon" as const };
  dataset.neighbors.outfits.push({
    id: 1160001,
    name: "友邻款帽子",
    relationship: "matching",
    neighborId: null,
    slotCode: 5001,
    slotName: "头戴物",
    modelPaths: { small: "NpcOutfits/Small/Hat", medium: null, big: "NpcOutfits/Big/Hat" },
    playerItemId: 60001,
    playerItemName: "玩家帽子",
    colors: ["蓝色"],
    materials: ["毛线"],
    styles: ["休闲"],
    specialTags: [],
    image,
    description: null,
    offers: [{ id: 50001, goodsGroupId: 500, configuredPrice: 120, currencyItemId: 200014 }],
  });
  expect(parseDataset(dataset).neighbors.outfits).toEqual(dataset.neighbors.outfits);
  expect(referencedImages(dataset)).toContainEqual(image);
  const legacy = { ...dataset.neighbors };
  Reflect.deleteProperty(legacy, "outfits");
  expect(parseNeighbors(legacy).outfits).toEqual([]);
  expect(parseDataset({ ...dataset, neighbors: legacy }).neighbors.outfits).toEqual([]);
  const outfit = dataset.neighbors.outfits[0]!;
  const offer = outfit.offers[0]!;
  for (const invalid of [
    { ...outfit, playerItemId: null },
    { ...outfit, relationship: "neighbor-specific", neighborId: null },
    { ...outfit, modelPaths: { small: null, medium: null, big: null } },
    { ...outfit, offers: [offer, offer] },
    { ...outfit, offers: [{ ...offer, configuredPrice: -1 }] },
    { ...outfit, offers: [{ ...offer, configuredPrice: 1.5 }] },
    { ...outfit, offers: [{ ...offer, available: true }] },
  ])
    expect(() => parseNeighbors({ ...dataset.neighbors, outfits: [invalid] })).toThrow();
  dataset.neighbors.outfits[0]!.neighborId = 999;
  expect(validateDataset(dataset)).toContainEqual(
    expect.objectContaining({ message: "Unknown neighbor 999" }),
  );
});
test("duplicate entities, dangling groups and ingredient cycles are reported together", () => {
  const dataset = emptyDataset(context, source);
  dataset.catalog.references.push({ id: 1, name: "物品" }, { id: 1, name: "物品" });
  dataset.catalog.records.push({
    ...base,
    type: "furniture.set",
    acquisition: null,
    memberIds: [99],
  });
  dataset.catalog.ingredientCategories.push({
    tagId: 2,
    itemIds: [],
  });
  dataset.gameplayTags.tags.push({
    id: 2,
    internalName: "食材",
    displayName: null,
    enumName: null,
    parentId: 2,
  });
  const messages = validateDataset(dataset).map((issue) => issue.message);
  expect(messages).toContain("Duplicate identity 1");
  expect(messages).toContain("Unknown furniture 99");
  expect(messages).toContain("Tag parent cycle");
});
test("unknown member sets remain distinct from confirmed empty sets", () => {
  const catalog = emptyDataset(context, source).catalog;
  catalog.records.push(
    { ...base, type: "plants.series", acquisition: null, memberIds: null },
    { ...base, id: 2, type: "plants.series", acquisition: null, memberIds: [] },
  );
  const result = CatalogSchema.parse(catalog);
  expect(
    result.records.filter((group) => "memberIds" in group).map((group) => group.memberIds),
  ).toEqual([null, []]);
});
test("all nested image references use the same traversal and asset coverage check", () => {
  const dataset = emptyDataset(context, source);
  const image = { assetId: "source-image", variant: "icon" as const };
  dataset.catalog.records.push({
    ...base,
    type: "material",
    subcategory: null,
    trade: null,
    acquisition: null,
    image,
  });
  expect(referencedImages(dataset)).toEqual([image]);
  expect(() =>
    parseRelease({
      manifest: {
        ...context,
        source,
        files: ["gameplay-tags", "catalog", "neighbors", "world", "assets"].map((kind) => ({
          kind,
          path: kind === "assets" ? "assets.json" : `zh-CN/${kind}.json`,
          sha256: "b".repeat(64),
          bytes: 1,
        })),
      },
      dataset,
      assets: { ...context, kind: "assets", images: [] },
    }),
  ).toThrow("Missing image");
});

test("planting stages must target formal plants, not auxiliary references", () => {
  const dataset = emptyDataset(context, source);
  dataset.catalog.references.push({ id: 1, name: "植物" });
  dataset.catalog.records.push({
    ...base,
    id: 10,
    type: "seed",
    growthId: 10,
    trade: null,
    acquisition: null,
    admissionReasons: ["deterministicSeed"],
  });
  dataset.catalog.growths.push({
    id: 10,
    kind: "staged",
    maturityDays: null,
    stages: [{ id: 20, name: "植株", image: null, plantId: 1 }],
  });
  expect(validateDataset(dataset).some((issue) => issue.message === "Unknown plant 1")).toBe(true);
  dataset.catalog.references = [];
  dataset.catalog.records.push({
    ...base,
    type: "plant",
    subcategory: null,
    trade: null,
    acquisition: null,
    flowerColors: null,
    drops: null,
    hybridRecipes: null,
  });
  expect(validateDataset(dataset)).toEqual([]);
});
