import { describe, expect, it } from "vite-plus/test";
import type { DishItem, DishSeries } from "../collection-view.ts";
import { ingredientsFixture } from "../ingredients/fixture";
import type { IngredientsData } from "../ingredients/model";
import type { DishesBrowserData } from "./data";
import { filterGroups, queryDishes } from "./query";
import { emptyQuery, missing, ungrouped } from "./search";

function item(id: number, fields: Partial<DishItem> = {}): DishItem {
  return {
    id,
    name: "菜肴" + id,
    image: null,
    description: null,
    quality: null,
    difficulty: null,
    galaxyFlavor: null,
    cookware: null,
    effectsText: null,
    effects: null,
    tastes: null,
    difficultyRequirement: null,
    acquisition: null,
    recipe: null,
    ...fields,
  };
}

const items = [
  item(1, {
    name: "星露烤鱼",
    quality: 2,
    difficulty: "中等",
    galaxyFlavor: "星屿，禾夏",
    cookware: "烤架",
    effectsText: "耐力上限提升 5 点",
    effects: [
      {
        effectId: 1,
        name: "耐力提升",
        description: "耐力上限提升 5 点",
        level: 1,
        uses: null,
        durationSeconds: 30,
      },
    ],
    tastes: ["甜"],
    difficultyRequirement: {
      rawExpression: "unused",
      condition: { kind: "chefLevelGreaterOrEqual", level: 5 },
      unresolvedReason: null,
    },
    acquisition: "烹饪",
  }),
  item(2, {
    name: "星露蒸鱼",
    quality: 0,
    difficulty: "简单",
    galaxyFlavor: "禾夏",
    cookware: "蒸锅",
    effectsText: "耐力上限提升 3 点",
    tastes: ["甜", "咸"],
    acquisition: "烹饪",
  }),
  item(3),
  item(4, { name: "Alpha", quality: 2, difficulty: "中等", cookware: "烤架" }),
];
const series: DishSeries[] = [
  {
    id: 100,
    name: "星露系列",
    image: null,
    description: null,
    quality: 1,
    seriesName: null,
    dishIds: [2, 1],
  },
  {
    id: 101,
    name: "空系列",
    image: null,
    description: null,
    quality: 2,
    seriesName: null,
    dishIds: [],
  },
  {
    id: 102,
    name: "未定系列",
    image: null,
    description: null,
    quality: null,
    seriesName: null,
    dishIds: null,
  },
];
const emptyIngredients = (): IngredientsData => ({
  categories: [],
  categoriesById: new Map(),
  dimensions: new Map(),
  itemsById: new Map(),
  categoriesByItemId: new Map(),
  dishesByItemId: new Map(),
  dishesByCategoryId: new Map(),
  unconfirmedRecipeCount: 0,
});
const browserData = (
  items: DishItem[],
  series: DishSeries[] = [],
  ingredients = emptyIngredients(),
): DishesBrowserData => ({ items, series, ingredients });
const data = browserData(items, series);
const ids = (rows: { id: number }[]) => rows.map((row) => row.id);
const search = (patch: Partial<ReturnType<typeof emptyQuery>>) =>
  queryDishes(data, "items", { ...emptyQuery(), ...patch });

describe("dish catalog", () => {
  it("preserves source order and searches dish and series names", () => {
    expect(queryDishes(data, "items", emptyQuery()).rows).toEqual(items);
    expect(queryDishes(data, "series", emptyQuery()).rows).toEqual(series);
    expect(ids(search({ q: " 鱼 " }).rows)).toEqual([1, 2]);
    expect(ids(search({ q: "ALPHA" }).rows)).toEqual([4]);
    expect(ids(queryDishes(data, "series", { ...emptyQuery(), q: "空" }).rows)).toEqual([101]);
    expect(search({ q: "不存在" }).total).toBe(0);
  });

  it("combines attributes with AND and selected values with OR", () => {
    expect(
      ids(
        search({
          difficulties: ["中等", "简单"],
          difficultyRequirements: ["厨师等级 ≥ 5"],
          tastes: ["甜"],
          galaxyFlavors: ["星屿"],
          cookwares: ["烤架"],
          effects: ["耐力上限提升 5 点"],
          qualities: ["2"],
          series: ["100"],
        }).rows,
      ),
    ).toEqual([1]);
    expect(ids(search({ galaxyFlavors: ["禾夏"] }).rows)).toEqual([1, 2]);
    expect(ids(search({ cookwares: ["烤架", "蒸锅"] }).rows)).toEqual([1, 2, 4]);
    expect(ids(search({ tastes: ["咸"] }).rows)).toEqual([2]);
    expect(ids(search({ difficultyRequirements: ["无额外条件"] }).rows)).toEqual([2, 3, 4]);
    expect(ids(search({ effects: ["耐力提升"] }).rows)).toEqual([1]);
  });

  it("filters missing values and does not infer unconfirmed series membership", () => {
    expect(
      ids(
        search({
          difficulties: [missing],
          tastes: [missing],
          galaxyFlavors: [missing],
          cookwares: [missing],
          effects: [missing],
          qualities: [missing],
        }).rows,
      ),
    ).toEqual([3]);
    expect(ids(search({ series: [ungrouped] }).rows)).toEqual([]);
    const seriesOptions = filterGroups(data).find((group) => group.key === "series")?.options;
    expect(seriesOptions).not.toContainEqual({ value: "102", label: "未定系列" });
    expect(seriesOptions).not.toContainEqual({ value: ungrouped, label: "未归入系列" });
    const flavorOptions = filterGroups(data).find(
      (group) => group.key === "galaxyFlavors",
    )?.options;
    expect(flavorOptions).toContainEqual({ value: "星屿", label: "星屿" });
  });

  it("offers only quality filters in series view", () => {
    expect(filterGroups(data, "series").map((group) => group.key)).toEqual(["qualities"]);
    expect(ids(queryDishes(data, "series", { ...emptyQuery(), qualities: ["2"] }).rows)).toEqual([
      101,
    ]);
  });

  it("shows missing quality only when the current view has missing values", () => {
    const completeSeries = browserData([item(1)], [{ ...series[0]!, quality: 1 }]);
    expect(
      filterGroups(completeSeries, "series")[0]?.options.some((option) => option.value === missing),
    ).toBe(false);
    expect(
      filterGroups(
        browserData([item(1)], [{ ...series[0]!, quality: null }]),
        "series",
      )[0]?.options.some((option) => option.value === missing),
    ).toBe(true);
  });

  it("sorts by name and quality with missing values last without mutating input", () => {
    expect(ids(search({ sort: "quality-desc" }).rows)).toEqual([1, 4, 2, 3]);
    expect(ids(search({ sort: "quality-asc" }).rows)).toEqual([2, 1, 4, 3]);
    expect(ids(search({ sort: "name-asc" }).rows)).toEqual([3, 1, 2, 4]);
    expect(ids(items)).toEqual([1, 2, 3, 4]);
  });

  it("recognizes ungrouped dishes when every series membership list is known", () => {
    const completeData = browserData(
      items,
      series.filter((group) => group.dishIds !== null),
    );
    expect(
      filterGroups(completeData)
        .find((group) => group.key === "series")
        ?.options.some((option) => option.value === ungrouped),
    ).toBe(true);
    expect(
      ids(queryDishes(completeData, "items", { ...emptyQuery(), series: [ungrouped] }).rows),
    ).toEqual([3, 4]);
  });

  it("filters dishes by eligible ingredient category candidates", () => {
    const { input, data: ingredients } = ingredientsFixture();
    const data = { ...input.dishes, ingredients };
    const search = (ingredientCategories: string[], q = "") =>
      queryDishes(data, "items", { ...emptyQuery(), q, ingredientCategories }).rows;
    expect(ids(search(["11"]))).toEqual([100, 102, 109]);
    expect(ids(search(["13", "12"]))).toEqual([101, 102]);
    expect(ids(search(["999"]))).toEqual([]);
    expect(ids(search(["11"], "101"))).toEqual([]);
    expect(ids(search(["13"], "101"))).toEqual([101]);
    expect(filterGroups(data)[0]).toMatchObject({
      key: "ingredientCategories",
      label: "所需食材",
    });
    expect(filterGroups(data)[0].options.map((option) => option.label)).toContain("虾类");
  });
});
