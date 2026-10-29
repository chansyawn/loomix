import { describe, expect, it } from "vite-plus/test";
import { flattenFilterOptions } from "../collection/filter-types";
import { ingredientsFixture } from "./fixture";
import {
  dishIngredientTagCounts,
  ingredientTagCounts,
  ingredientTagFilterGroup,
  ingredientTagMatches,
  normalizeIngredientTagIds,
} from "./tag-filter";

describe("ingredient tag filtering", () => {
  it("builds three nonselectable dimension sections with zero-count options", () => {
    const { data } = ingredientsFixture();
    const counts = ingredientTagCounts(data, data.itemsById.values());
    const group = ingredientTagFilterGroup(data, counts);
    const options = flattenFilterOptions(group.options);
    const selectable = options.filter((option) => option.selectable !== false);

    expect(group.options.map((option) => option.label)).toEqual(["分类", "颜色", "食材品质"]);
    expect(group.options.every((option) => option.selectable === false)).toBe(true);
    expect(selectable.map((option) => option.value)).toEqual([
      "2",
      "10",
      "11",
      "12",
      "14",
      "15",
      "3",
      "13",
      "21",
      "31",
    ]);
    expect(options.find((option) => option.value === "13")).toMatchObject({
      label: "虾类",
      chipLabel: "分类 · 荤菜 / 虾类",
      count: 2,
    });
    expect(options.find((option) => option.value === "14")).toMatchObject({
      count: 0,
      disabled: true,
    });
    expect(options.find((option) => option.value === "20")).toBeUndefined();
    expect(options.find((option) => option.value === "30")).toBeUndefined();
    expect(options.find((option) => option.value === "21")?.chipLabel).toBe("颜色 · 红色蔬菜");
    expect(options.find((option) => option.value === "31")?.chipLabel).toBe("品质 · 特优");
  });

  it("expands selected parents and closes fully selected branches", () => {
    const { data } = ingredientsFixture();
    expect(normalizeIngredientTagIds(data, ["2", "11", "13"])).toEqual([
      "2",
      "3",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
    ]);
    expect(normalizeIngredientTagIds(data, ["20", "21"])).toEqual(["21"]);
    expect(normalizeIngredientTagIds(data, ["13"])).toEqual(["3", "13"]);
    expect(normalizeIngredientTagIds(data, ["999", "invalid"])).toEqual([]);
  });

  it("matches alternatives within a dimension and intersections across dimensions", () => {
    const { data } = ingredientsFixture();
    const matching = (tags: string[]) =>
      [...data.itemsById.keys()].filter((itemId) => ingredientTagMatches(data, tags, itemId));

    expect(matching(["2"])).toEqual([1, 2, 3, 4]);
    expect(matching(["13", "12"])).toEqual([4, 5, 6]);
    expect(matching(["13", "31"])).toEqual([6]);
    expect(matching(["999"])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("counts each tag from dishes only once even with several matching candidates", () => {
    const { data, input } = ingredientsFixture();
    const counts = dishIngredientTagCounts(data, input.dishes.items);
    expect(counts.get(11)).toBe(3);
    expect(counts.get(13)).toBe(1);
    expect(counts.get(31)).toBe(3);
  });
});
