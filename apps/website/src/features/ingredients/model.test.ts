import { describe, expect, it } from "vite-plus/test";
import { categoryExpression, ingredientsFixture } from "./fixture";
import { buildIngredientsData, ingredientConditionLabel, ingredientUsage } from "./model";

describe("ingredient relationships", () => {
  it("indexes concrete ingredients without mixing attribute dimensions or reference-only items", () => {
    const { data } = ingredientsFixture();
    expect([...data.itemsById.keys()]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(data.dimensions.get(21)).toBe("color");
    expect(data.dimensions.get(31)).toBe("quality");
    expect(data.dimensions.get(1)).toBe("group");
    expect(data.dimensions.get(11)).toBe("type");
  });

  it("preserves resolved intersections instead of matching every item sharing one category", () => {
    const { data } = ingredientsFixture();
    expect(data.dishesByItemId.get(5)).toBeUndefined();
    expect(data.dishesByItemId.get(6)?.map((match) => match.dish.id)).toEqual([101]);
    expect(data.dishesByItemId.get(6)?.[0].conditions[0].label).toBe("虾类 且 特优");
    expect(data.dishesByItemId.get(2)?.some((match) => match.dish.id === 101)).toBe(false);
    expect(data.dishesByItemId.get(4)?.map((match) => match.dish.id)).toEqual([102]);
  });

  it("deduplicates dishes and candidate IDs while retaining every matching slot", () => {
    const { data } = ingredientsFixture();
    const matches = data.dishesByItemId.get(1)!;
    expect(matches.map((match) => match.dish.id)).toEqual([100, 102, 109]);
    expect(matches[0].conditions.map((condition) => condition.position)).toEqual([1, 2]);
  });

  it("skips unconfirmed slots without discarding known slots or treating confirmed empty recipes as unknown", () => {
    const { data } = ingredientsFixture();
    expect(data.unconfirmedRecipeCount).toBe(5);
    expect(data.dishesByItemId.get(1)?.map((match) => match.dish.id)).not.toContain(106);
    expect(data.dishesByItemId.get(4)?.map((match) => match.dish.id)).toEqual([102]);
  });

  it("exposes useful ingredient tags and hides cooking sections for noningredients", () => {
    const { data } = ingredientsFixture();
    expect(ingredientUsage(data, 2)?.tags.map((tag) => tag.category.id)).toEqual([
      2, 10, 11, 21, 31,
    ]);
    expect(ingredientUsage(data, 2)?.tags.map((tag) => tag.filterKey)).toEqual([
      "types",
      "types",
      "types",
      "colors",
      "qualities",
    ]);
    expect(ingredientUsage(data, 5)).toMatchObject({ dishes: [] });
    expect(ingredientUsage(data, 8)).toBeNull();
    expect(ingredientUsage(data, 9)).toBeNull();
  });

  it("formats nested alternatives without losing boolean grouping", () => {
    const { data } = ingredientsFixture();
    expect(
      ingredientConditionLabel(
        {
          kind: "all",
          terms: [
            { kind: "any", terms: [categoryExpression(11), categoryExpression(12)] },
            categoryExpression(31),
          ],
        },
        data.categoriesById,
      ),
    ).toBe("（番茄 或 水果类） 且 特优");
    expect(ingredientConditionLabel(categoryExpression(999), data.categoriesById)).toBe(
      "未收录类别",
    );
  });

  it("does not mutate source membership or recipes while building indexes", () => {
    const { input } = ingredientsFixture();
    const before = JSON.stringify(input.ingredientCategories) + JSON.stringify(input.dishes);
    buildIngredientsData(input);
    expect(JSON.stringify(input.ingredientCategories) + JSON.stringify(input.dishes)).toBe(before);
  });
});
