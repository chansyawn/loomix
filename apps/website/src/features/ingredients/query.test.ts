import { describe, expect, it } from "vite-plus/test";
import { flattenFilterOptions } from "../collection/filter-types";
import { ingredientsFixture } from "./fixture";
import { ingredientFilterGroups, queryIngredients } from "./query";
import { ingredientsQuerySchema } from "./search";

describe("ingredient browsing and filtering", () => {
  it("starts with every concrete ingredient and treats tags as filters", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(data, ingredientsQuerySchema.parse({}));
    expect(result.active).toBe(false);
    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("searches concrete ingredient names without matching category names", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(data, ingredientsQuerySchema.parse({ q: " 番茄 " }));
    expect(result.items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(queryIngredients(data, ingredientsQuerySchema.parse({ q: "水果类" })).items).toEqual([]);
  });

  it("combines tag dimensions while accepting alternatives within each dimension", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(
      data,
      ingredientsQuerySchema.parse({ ingredientTags: ["10", "13", "21", "31"] }),
    );
    expect(result.items.map((item) => item.id)).toEqual([2]);
    expect(
      queryIngredients(data, ingredientsQuerySchema.parse({ ingredientTags: ["999"] })).items.map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(
      queryIngredients(data, ingredientsQuerySchema.parse({ ingredientTags: ["2"] })).items.map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it("builds one full tree and filters by parent or child tags", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(data, ingredientsQuerySchema.parse({}));
    const group = ingredientFilterGroups(data, result.counts)[0];
    const options = flattenFilterOptions(group.options);
    expect(options.find((option) => option.value === "13")).toMatchObject({
      chipLabel: "分类 · 荤菜 / 虾类",
      count: 2,
    });
    expect(options.find((option) => option.value === "14")?.disabled).toBe(true);
    expect(
      queryIngredients(data, ingredientsQuerySchema.parse({ ingredientTags: ["2"] })).items.map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3, 4]);
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({ ingredientTags: ["13", "12"] }),
      ).items.map((item) => item.id),
    ).toEqual([4, 5, 6]);
    expect(
      queryIngredients(
        data,
        ingredientsQuerySchema.parse({ ingredientTags: ["13", "31"] }),
      ).items.map((item) => item.id),
    ).toEqual([6]);
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
    expect([...data.itemsById.keys()]).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("returns an empty result for unknown names", () => {
    const result = queryIngredients(
      ingredientsFixture().data,
      ingredientsQuerySchema.parse({ q: "不存在的食材" }),
    );
    expect(result.items).toEqual([]);
  });
});
