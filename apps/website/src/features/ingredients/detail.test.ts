import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import { ingredientsFixture } from "./fixture";
import { ingredientCategoryDetail, parseIngredientCategoryId } from "./detail";

describe("ingredient category details", () => {
  it("resolves hierarchy, actual members and deduplicated associated recipes", () => {
    const detail = ingredientCategoryDetail(ingredientsFixture().data, 11);
    expect(detail.record.name).toBe("番茄");
    expect(detail.parents.map((category) => category.id)).toEqual([1, 2, 10]);
    expect(detail.items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(detail.dishes.map((match) => match.dish.id)).toEqual([100, 102, 109]);
  });

  it("keeps empty categories addressable and excludes unavailable references and empty child categories", () => {
    const { data } = ingredientsFixture();
    expect(ingredientCategoryDetail(data, 14)).toMatchObject({ items: [], dishes: [] });
    expect(ingredientCategoryDetail(data, 15).items).toEqual([]);
    expect(ingredientCategoryDetail(data, 2).children.map((category) => category.id)).toEqual([
      10, 12,
    ]);
  });

  it("rejects malformed and unknown category IDs", () => {
    expect(parseIngredientCategoryId("11")).toBe(11);
    for (const value of ["0", "-1", "1.1", "1e2", "01", "abc", "", "9007199254740992"]) {
      expect(() => parseIngredientCategoryId(value)).toThrow();
      try {
        parseIngredientCategoryId(value);
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
    try {
      ingredientCategoryDetail(ingredientsFixture().data, 999);
      throw new Error("Expected not found");
    } catch (error) {
      expect(isNotFound(error)).toBe(true);
    }
  });
});
