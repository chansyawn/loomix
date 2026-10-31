import { expect, test } from "vite-plus/test";
import { emptyDataset } from "@loomix/schema/dataset";
import { assetsFixture, fixtureContext, fixtureSource } from "./collection-fixture";
import { toCollectionView } from "./collection-view";

test("catalog entries control listing while reference entities remain available to relationships", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  const base = { name: "材料", image: null, quality: null, description: null };
  catalog.items.push(
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
  catalog.entries.push({ entity: { kind: "item", id: 1 }, encyclopedia: null });
  const view = toCollectionView(catalog, assetsFixture(catalog));
  expect(view.miscellaneous.map((item) => item.id)).toEqual([1]);
  expect(view.miscellaneous[0]?.acquisition).toBe("来源甲，来源乙");
  expect(view.ingredientItemsById.get(2)).toMatchObject({ listed: false });
});

test("external appearance records retain their identity without entering item lists", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  catalog.appearances.push({
    id: 8,
    name: "发型",
    subcategory: "发型",
    image: null,
    quality: null,
    description: null,
  });
  catalog.entries.push({ entity: { kind: "appearance", id: 8 }, encyclopedia: { listed: false } });
  expect(toCollectionView(catalog, assetsFixture(catalog)).clothing.appearances[0].id).toBe(8);
});

test("creature details retain scientific names and localized acquisition labels", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  catalog.items.push({
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
  catalog.entries.push({ entity: { kind: "item", id: 1 }, encyclopedia: { listed: true } });

  expect(toCollectionView(catalog, assetsFixture(catalog)).creatures.items[0]).toMatchObject({
    scientificName: "Cyprinus carpio",
    acquisition: "钓鱼，河域钓取",
  });
});

test("dish details retain tastes, structured effects, unlock requirements and acquisition", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  catalog.items.push({
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
  catalog.entries.push({ entity: { kind: "item", id: 1 }, encyclopedia: { listed: true } });

  expect(toCollectionView(catalog, assetsFixture(catalog)).dishes.items[0]).toMatchObject({
    effectsText: "增加 40 力气",
    effects: [{ name: "大力播洒 一阶", durationSeconds: 10 }],
    tastes: ["甜", "咸"],
    difficultyRequirement: { condition: { kind: "chefLevelGreaterOrEqual", level: 5 } },
    acquisition: "烹饪",
  });
});

test("furniture, clothing and materials display structured acquisition conditions", () => {
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
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
  catalog.items.push(
    {
      ...common,
      type: "furniture",
      furnitureType: null,
      size: null,
      colors: null,
      materials: null,
      craftingRecipes: null,
    },
    { ...common, id: 2, type: "clothing", colors: null, materials: null, styles: null },
    { ...common, id: 3, type: "material" },
  );
  for (const item of catalog.items)
    catalog.entries.push({ entity: { kind: "item", id: item.id }, encyclopedia: null });
  const view = toCollectionView(catalog, assetsFixture(catalog));
  for (const item of [view.furniture.items[0], view.clothing.items[0], view.miscellaneous[0]]) {
    expect(item.acquisition).toBe("星屿探索（完成探索）");
    expect(item).not.toHaveProperty("sources");
  }
});
