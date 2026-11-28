import { describe, expect, it } from "vite-plus/test";
import type { DishItem, DishSeries } from "../omnidex-view.ts";
import { flattenFilterOptions } from "../omnidex/filter-types";
import {
  categoryExpression,
  ingredientsFixture,
  recipeFixture,
  recipeSlot,
} from "../ingredients/fixture";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { buildIngredientsData } from "../ingredients/model";
import type { IngredientsData } from "../ingredients/model";
import { createIngredientTagSource } from "../ingredients/tag-source";
import type { DishesBrowserData } from "./data";
import { filterGroups, queryDishes } from "./query";
import { emptyQuery, missing, ungrouped } from "./search";
import type { ViewQuery } from "./search";

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
    strength: null,
    effects: null,
    tastes: null,
    unlockCondition: null,
    slots: [],
    recipeItems: [],
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
    strength: 5,
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
    unlockCondition: { kind: "chefLevelGreaterOrEqual", level: 5 },
  }),
  item(2, {
    name: "星露蒸鱼",
    quality: 0,
    difficulty: "简单",
    galaxyFlavor: "禾夏",
    cookware: "蒸锅",
    tastes: ["甜", "咸"],
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
  tagSource: createIngredientTagSource(createGameplayTagIndex([]), []),
  itemsById: new Map(),
  ingredientCandidatesByDishId: new Map(),
  dishesByItemId: new Map(),
});
const browserData = (
  items: DishItem[],
  series: DishSeries[] = [],
  ingredients = emptyIngredients(),
): DishesBrowserData => ({
  items,
  series,
  ingredients,
  ingredientTagSource: ingredients.tagSource,
  ingredientItemsById: ingredients.itemsById,
});
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
          effects: ["增加 5 力气"],
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

  it("filters dishes through the shared ingredient tag semantics", () => {
    const { input, data: ingredients } = ingredientsFixture();
    const data = {
      ...input.dishes,
      ingredients,
      ingredientTagSource: ingredients.tagSource,
      ingredientItemsById: ingredients.itemsById,
    };
    const search = (patch: Partial<ViewQuery>, q = "") =>
      queryDishes(data, "items", { ...emptyQuery(), q, ...patch }).rows;
    expect(ids(search({ ingredientCategories: ["11"] }))).toEqual([100, 102]);
    expect(ids(search({ ingredientCategories: ["13", "12"] }))).toEqual([101, 102]);
    expect(ids(search({ ingredientCategories: ["13"], ingredientQualities: ["31"] }))).toEqual([
      101,
    ]);
    expect(ids(search({ ingredientCategories: ["999"] }))).toEqual(ids(data.items));
    expect(ids(search({ ingredientCategories: ["11"] }, "101"))).toEqual([]);
    expect(ids(search({ ingredientCategories: ["13"] }, "101"))).toEqual([101]);
    expect(
      filterGroups(data)
        .slice(0, 3)
        .map((group) => group.key),
    ).toEqual(["ingredientCategories", "ingredientColors", "ingredientQualities"]);
    expect(
      flattenFilterOptions(filterGroups(data)[0].options).map((option) => option.label),
    ).toContain("虾类");
  });

  it("does not combine dimensions across separate recipe slots", () => {
    const { input } = ingredientsFixture();
    const crossSlotDish = recipeFixture(110, [
      recipeSlot(categoryExpression(13), [5]),
      recipeSlot(categoryExpression(31), [2]),
    ]);
    const ingredients = buildIngredientsData({
      ...input,
      dishes: { ...input.dishes, items: [...input.dishes.items, crossSlotDish] },
    });
    const data = {
      ...input.dishes,
      ingredients,
      ingredientTagSource: ingredients.tagSource,
      ingredientItemsById: ingredients.itemsById,
    };

    expect(
      ids(
        queryDishes(data, "items", {
          ...emptyQuery(),
          ingredientCategories: ["13"],
          ingredientQualities: ["31"],
        }).rows,
      ),
    ).toEqual([101]);
  });
});
