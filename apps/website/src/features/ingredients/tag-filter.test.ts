import { describe, expect, it } from "vite-plus/test";
import { collectionFilterChips } from "../collection/filter-chips";
import { flattenFilterOptions } from "../collection/filter-types";
import { ingredientsFixture } from "./fixture";
import {
  acceptIngredientTagIds,
  dishIngredientTagCounts,
  ingredientFilterGroups,
  ingredientSelectedIds,
  ingredientTagCounts,
  ingredientTagMatcher,
  normalizeIngredientSelection,
} from "./tag-filter";
import type { IngredientTagSelection } from "./tag-filter";

function selection(
  categories: string[] = [],
  colors: string[] = [],
  qualities: string[] = [],
): IngredientTagSelection {
  return {
    ingredientCategories: categories,
    ingredientColors: colors,
    ingredientQualities: qualities,
  };
}

describe("ingredient tag filtering", () => {
  it("builds three independently selectable groups with pruned tags", () => {
    const { data } = ingredientsFixture();
    const counts = ingredientTagCounts(data.tagSource, data.itemsById.values());
    const groups = ingredientFilterGroups(data.tagSource, counts);

    expect(groups.map((group) => group.label)).toEqual(["分类", "颜色", "食材品质"]);
    expect(groups.map((group) => group.key)).toEqual([
      "ingredientCategories",
      "ingredientColors",
      "ingredientQualities",
    ]);
    expect(groups.every((group) => group.tree && group.selectionMode === "independent")).toBe(true);
    expect(groups[0].description).toBeTruthy();

    const categories = flattenFilterOptions(groups[0].options);
    const colors = flattenFilterOptions(groups[1].options);
    const qualities = flattenFilterOptions(groups[2].options);
    expect(groups[0].options.map((option) => option.label)).toEqual(["荤菜", "素食"]);
    expect(categories.find((option) => option.value === "13")).toMatchObject({
      label: "虾类",
      chipLabel: "分类：荤菜 / 虾类",
      count: 2,
    });
    expect(categories.find((option) => option.value === "11")?.chipLabel).toBe(
      "分类：素食 / 蔬菜类 / 番茄",
    );
    expect(colors.map((option) => option.label)).toEqual(["红色蔬菜"]);
    expect(colors[0].chipLabel).toBe("颜色：红色蔬菜");
    expect(qualities.map((option) => option.label)).toEqual(["特优"]);
    expect(qualities[0].chipLabel).toBe("食材品质：特优");
    expect([...categories, ...colors, ...qualities].some((option) => option.value === "40")).toBe(
      false,
    );
  });

  it("disables options with zero matches in the current result set", () => {
    const { data } = ingredientsFixture();
    const counts = ingredientTagCounts(data.tagSource, data.itemsById.values());
    counts.delete(12);
    const [categories] = ingredientFilterGroups(data.tagSource, counts).map((group) =>
      flattenFilterOptions(group.options),
    );
    expect(categories.find((option) => option.value === "12")).toMatchObject({
      count: 0,
      disabled: true,
    });
  });

  it("matches alternatives inside a group and intersections across groups", () => {
    const { data } = ingredientsFixture();
    const matching = (values: IngredientTagSelection) =>
      [...data.itemsById.keys()].filter((itemId) =>
        ingredientTagMatcher(data.tagSource, values)(itemId),
      );

    expect(matching(selection())).toEqual([5, 6, 1, 2, 3, 4]);
    expect(matching(selection(["2"]))).toEqual([1, 2, 3, 4]);
    expect(matching(selection(["13", "12"]))).toEqual([5, 6, 4]);
    expect(matching(selection(["13"], [], ["31"]))).toEqual([6]);
    expect(matching(selection(["999"]))).toEqual([5, 6, 1, 2, 3, 4]);
  });

  it("drops unknown, structural, hidden and cross-group IDs", () => {
    const { data } = ingredientsFixture();
    expect(
      acceptIngredientTagIds(data.tagSource, "ingredientCategories", [
        "2",
        "20",
        "30",
        "40",
        "999",
        "invalid",
      ]),
    ).toEqual(["2"]);
    expect(acceptIngredientTagIds(data.tagSource, "ingredientColors", ["21", "11"])).toEqual([
      "21",
    ]);
    expect(
      normalizeIngredientSelection(data.tagSource, selection(["2"], ["21", "999"], ["31", "31"])),
    ).toEqual(selection(["2"], ["21"], ["31"]));
    expect(ingredientSelectedIds(selection(["2"], ["21"], ["31"]))).toEqual([2, 21, 31]);
  });

  it("labels chips with the group name and path", () => {
    const { data } = ingredientsFixture();
    const counts = ingredientTagCounts(data.tagSource, data.itemsById.values());
    const groups = ingredientFilterGroups(data.tagSource, counts);
    const chips = collectionFilterChips(groups, selection(["2"], ["21"], ["31"]), () => {}, {
      value: "",
      clear: () => {},
    });

    expect(chips.map((chip) => chip.label)).toEqual([
      "分类：素食",
      "颜色：红色蔬菜",
      "食材品质：特优",
    ]);
  });

  it("counts each ingredient tag from dishes only once", () => {
    const { data, input } = ingredientsFixture();
    const counts = dishIngredientTagCounts(
      data.tagSource,
      data.ingredientCandidatesByDishId,
      input.dishes.items,
    );
    expect(counts.get(11)).toBe(3);
    expect(counts.get(13)).toBe(1);
    expect(counts.get(31)).toBe(3);
  });
});
