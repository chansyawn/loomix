import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import {
  assetsFixture,
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
      type: "material",
      subcategory: null,
      trade: null,
      acquisition: [
        { sourceId: 1, label: "来源甲", condition: null },
        { sourceId: 2, label: "来源乙", condition: null },
      ],
    },
    { ...base, id: 2, type: "reference" },
  );
  const view = toCollectionView(
    catalog,
    assetsFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  expect(view.miscellaneous.map((item) => item.id)).toEqual([1]);
  expect(view.miscellaneous[0]?.acquisition).toBe("来源甲，来源乙");
  expect(view.ingredientItemsById.get(2)).toMatchObject({ listed: false });
});

test("external appearance records retain their identity without entering item lists", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    type: "appearance",
    acquisition: null,
    id: 8,
    name: "发型",
    subcategory: "发型",
    image: null,
    quality: null,
    description: null,
  });
  expect(
    toCollectionView(catalog, assetsFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .clothing.appearances[0].id,
  ).toBe(8);
});

test("creature details retain scientific names and localized acquisition labels", () => {
  const { catalog, gameplayTags } = emptyDataset(fixtureContext, fixtureSource);
  addFixtureRecords(catalog, gameplayTags, {
    id: 1,
    name: "三色锦鲤",
    type: "creature",
    subcategory: "水生生物",
    image: null,
    description: null,
    quality: 2,
    trade: null,
    region: null,
    habitat: null,
    activeSeasons: null,
    activeTimes: null,
    activeWeather: null,
    sizeRange: null,
    scientificName: "Cyprinus carpio",
    acquisition: [
      { sourceId: 104, label: "钓鱼", condition: null },
      { sourceId: 108, label: "河域钓取", condition: null },
    ],
    size: null,
    grades: null,
  });

  expect(
    toCollectionView(catalog, assetsFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
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
    type: "dish",
    subcategory: null,
    image: null,
    description: null,
    quality: 2,
    trade: null,
    acquisition: [{ sourceId: 1, label: "烹饪", condition: null }],
    difficulty: "招牌",
    galaxyFlavor: "禾夏风味",
    cookware: ["烤箱"],
    effectsText: "增加 40 力气",
    tastes: ["甜", "咸"],
    recipe: null,
    difficultyRequirement: {
      rawExpression: "condition",
      condition: { kind: "chefLevelGreaterOrEqual", level: 5 },
      unresolvedReason: null,
    },
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
  });

  expect(
    toCollectionView(catalog, assetsFixture(catalog), createGameplayTagIndex(gameplayTags.tags))
      .dishes.items[0],
  ).toMatchObject({
    effectsText: "增加 40 力气",
    effects: [{ name: "大力播洒 一阶", durationSeconds: 10 }],
    tastes: ["甜", "咸"],
    difficultyRequirement: { condition: { kind: "chefLevelGreaterOrEqual", level: 5 } },
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
    subcategory: null,
    trade: null,
    acquisition: [{ sourceId: 1, label: "星屿探索", condition: "完成探索" }],
  };
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      ...common,
      type: "furniture",
      furnitureType: null,
      size: null,
      colors: null,
      materials: null,
    },
    { ...common, id: 2, type: "clothing", colors: null, materials: null, styles: null },
    { ...common, id: 3, type: "material" },
  );
  const view = toCollectionView(
    catalog,
    assetsFixture(catalog),
    createGameplayTagIndex(gameplayTags.tags),
  );
  for (const item of [view.furniture.items[0], view.clothing.items[0], view.miscellaneous[0]]) {
    expect(item.acquisition).toBe("星屿探索（完成探索）");
    expect(item).not.toHaveProperty("sources");
  }
});
