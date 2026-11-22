import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import {
  imageIndexFixture,
  fixtureContext,
  fixtureSource,
  addFixtureRecords,
} from "./collection-fixture";
import { toCollectionView } from "./collection-view";

test("catalog entries control listing while reference entities remain available to relationships", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  const base = { name: "材料", image: null, quality: null, description: null };
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      ...base,
      id: 1,
      kind: "material",
      category: null,
      acquisition: [
        { sourceId: 1, label: "来源甲" },
        { sourceId: 2, label: "来源乙" },
      ],
    },
    { ...base, id: 2, kind: "reference" },
  );
  const view = toCollectionView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(view.miscellaneous.map((item) => item.id)).toEqual([1]);
  expect(view.miscellaneous[0]?.acquisition).toBe("来源甲，来源乙");
  expect(view.ingredientItemsById.get(2)).toMatchObject({ browsable: false });
});

test("external appearance records retain their identity without entering item lists", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    kind: "appearance",
    acquisition: null,
    id: 8,
    name: "发型",
    category: "发型",
    image: null,
    quality: null,
    description: null,
  });
  expect(
    toCollectionView(catalog, imageIndexFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .clothing.appearances[0].id,
  ).toBe(8);
});

test("有图和缺图的友邻服饰均进入专属列表", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  const file = `assets/${"a".repeat(64)}.webp`;
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      id: 9,
      name: "丰年连衣裙",
      kind: "neighborClothing",
      category: "连衣裙",
      image: null,
      quality: 1,
      neighborId: 1010,
      bodyTypes: ["medium", "big"],
    },
    {
      id: 10,
      name: "丰年手套",
      kind: "neighborClothing",
      category: "手套",
      image: { assetId: file, variant: "icon" },
      bodyTypes: ["small"],
      price: 0,
    },
  );
  const view = toCollectionView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(view.clothing.items).toEqual([]);
  expect(view.clothing.appearances).toEqual([]);
  expect(view.clothing.neighborClothing).toMatchObject([
    {
      id: 9,
      name: "丰年连衣裙",
      image: null,
      category: "连衣裙",
      quality: 1,
      bodyTypes: ["medium", "big"],
      price: null,
    },
    { id: 10, name: "丰年手套", image: file, category: "手套", bodyTypes: ["small"], price: 0 },
  ]);
  expect(view.ingredientItemsById.get(9)).toMatchObject({
    catalogCategory: "neighborClothing",
    browsable: false,
  });
});

test("creature details retain scientific names and localized acquisition labels", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    id: 1,
    name: "三色锦鲤",
    kind: "creature",
    category: "水生生物",
    image: null,
    description: null,
    quality: 2,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    sizeRange: null,
    scientificName: "Cyprinus carpio",
    acquisition: [
      { sourceId: 104, label: "钓鱼" },
      { sourceId: 108, label: "河域钓取" },
    ],
    size: null,
    grades: null,
  });

  expect(
    toCollectionView(catalog, imageIndexFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .creatures.items[0],
  ).toMatchObject({
    scientificName: "Cyprinus carpio",
    acquisition: "钓鱼，河域钓取",
  });
});

test("dish details retain tastes, structured effects, unlock requirements and acquisition", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    id: 1,
    name: "星露烤鱼",
    kind: "dish",
    category: null,
    image: null,
    description: null,
    quality: 2,
    acquisition: [{ sourceId: 1, label: "烹饪" }],
    galaxyFlavor: "禾夏风味",
    strength: 40,
    effects: [
      {
        effectId: 1000201,
        name: "大力播洒 一阶",
        description: "浇水或施肥范围提升",
        level: 1,
        uses: null,
        durationSeconds: 10,
      },
    ],
    cooking: {
      difficulty: "招牌",
      cookware: "烤箱",
      tastes: ["甜", "咸"],
      slots: [],
      unlockCondition: { kind: "chefLevelGreaterOrEqual", level: 5 },
    },
  });

  expect(
    toCollectionView(catalog, imageIndexFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .dishes.items[0],
  ).toMatchObject({
    strength: 40,
    effects: [{ name: "大力播洒 一阶", durationSeconds: 10 }],
    tastes: ["甜", "咸"],
    cookware: "烤箱",
    unlockCondition: { kind: "chefLevelGreaterOrEqual", level: 5 },
    acquisition: "烹饪",
  });
});

test("furniture, clothing and materials display structured acquisition conditions", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  const common = {
    id: 1,
    name: "物品",
    image: null,
    quality: null,
    description: null,
    category: null,
    acquisition: [{ sourceId: 1, label: "星屿探索" }],
  };
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      ...common,
      kind: "furniture",
      furnitureCategory: null,
      size: null,
      colors: null,
      materials: null,
    },
    { ...common, id: 2, kind: "clothing", colors: null, materials: null, styles: null },
    { ...common, id: 3, kind: "material" },
  );
  const view = toCollectionView(
    catalog,
    imageIndexFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  for (const item of [view.furniture.items[0], view.clothing.items[0], view.miscellaneous[0]]) {
    expect(item.acquisition).toBe("星屿探索");
    expect(item).not.toHaveProperty("sources");
  }
});
