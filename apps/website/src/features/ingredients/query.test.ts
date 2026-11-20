import { describe, expect, it } from "vite-plus/test";
import { flattenFilterOptions } from "../collection/filter-types";
import { ingredientsFixture } from "./fixture";
import { ingredientFilterGroups, queryIngredients } from "./query";
import { ingredientsQuerySchema } from "./search";

describe("ingredient browsing and filtering", () => {
  it("starts with every concrete ingredient in category-first order", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(data, ingredientsQuerySchema.parse({}));
    expect(result.active).toBe(false);
    expect(result.items.map((item) => item.id)).toEqual([5, 6, 1, 2, 3, 4]);
  });

  it("searches concrete ingredient names without matching category names", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(data, ingredientsQuerySchema.parse({ q: " fan qie " }));
    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(queryIngredients(data, ingredientsQuerySchema.parse({ q: "水果类" })).items).toEqual([]);
  });

  it("combines groups while accepting alternatives inside each group", () => {
    const { data } = ingredientsFixture();
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({
          ingredientCategories: ["10"],
          ingredientColors: ["21"],
          ingredientQualities: ["31"],
        }),
      ).items.map((item) => item.id),
    ).toEqual([2]);
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({ ingredientCategories: ["999"] }),
      ).items.map((item) => item.id),
    ).toEqual([5, 6, 1, 2, 3, 4]);
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({ ingredientCategories: ["2"] }),
      ).items.map((item) => item.id),
    ).toEqual([1, 2, 3, 4]);
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({ ingredientCategories: ["13", "12"] }),
      ).items.map((item) => item.id),
    ).toEqual([5, 6, 4]);
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({ ingredientCategories: ["13"], ingredientQualities: ["31"] }),
      ).items.map((item) => item.id),
    ).toEqual([6]);
  });

  it("builds three groups and disables options outside the current search", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(
      data,
      ingredientsQuerySchema.parse({ q: "fq", ingredientQualities: ["31"] }),
    );
    expect(result.items.map((item) => item.id)).toEqual([2]);
    const groups = ingredientFilterGroups(data, result.counts);
    expect(groups.map((group) => group.label)).toEqual(["分类", "颜色", "食材品质"]);
    const options = flattenFilterOptions(groups[0].options);
    expect(options.find((option) => option.value === "13")).toMatchObject({
      chipLabel: "分类：荤菜 / 虾类",
      count: 0,
      disabled: true,
    });
    expect(options.find((option) => option.value === "11")).toMatchObject({
      chipLabel: "分类：素食 / 蔬菜类 / 番茄",
      count: 3,
    });
  });

  it("sorts by unique associated dish counts without reordering source data", () => {
    const { data } = ingredientsFixture();
    expect(
      queryIngredients(data, ingredientsQuerySchema.parse({ sort: "recipes-desc" })).items[0].id,
    ).toBe(1);
    const names = queryIngredients(
      data,
      ingredientsQuerySchema.parse({ sort: "name-desc" }),
    ).items.map((item) => item.name);
    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a, "zh-CN")));
    expect([...data.itemsById.keys()]).toEqual([5, 6, 1, 2, 3, 4]);
  });

  it("returns an empty result for unknown names", () => {
    const result = queryIngredients(
      ingredientsFixture().data,
      ingredientsQuerySchema.parse({ q: "不存在的食材" }),
    );
    expect(result.items).toEqual([]);
  });
});
