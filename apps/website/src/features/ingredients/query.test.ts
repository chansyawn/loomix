import { describe, expect, it } from "vite-plus/test";
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

  it("combines type, color and quality across dimensions while accepting alternatives within each dimension", () => {
    const { data } = ingredientsFixture();
    const result = queryIngredients(
      data,
      ingredientsQuerySchema.parse({ types: ["10", "13"], colors: ["21"], qualities: ["31"] }),
    );
    expect(result.items.map((item) => item.id)).toEqual([2]);
    expect(queryIngredients(data, ingredientsQuerySchema.parse({ types: ["999"] })).items).toEqual(
      [],
    );
    expect(
      queryIngredients(data, ingredientsQuerySchema.parse({ types: ["2"] })).items.map(
        (item) => item.id,
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it("keeps color and quality roots out of filter options", () => {
    const groups = ingredientFilterGroups(ingredientsFixture().data);
    expect(groups.find((group) => group.key === "colors")?.options).toEqual([
      { value: "21", label: "红色蔬菜" },
    ]);
    expect(groups.find((group) => group.key === "qualities")?.options).toEqual([
      { value: "31", label: "特优" },
    ]);
    expect(groups[0].options.map((option) => option.value)).toEqual([
      "2",
      "3",
      "10",
      "11",
      "12",
      "13",
    ]);
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
