import type { IngredientCategory, IngredientExpression, Recipe } from "@loomix/schema/catalog";
import { describe, expect, it } from "vite-plus/test";
import type { IngredientItem } from "../collection-view";
import { buildDishRecipeSlots, type RecipeConditionToken } from "./recipe-presentation";

type RecipeSlot = NonNullable<Recipe["slots"]>[number];

const categories: IngredientCategory[] = [
  {
    id: 10,
    tagName: "食材_蔬菜",
    name: "蔬菜",
    parentId: null,
    itemIds: [1, 2],
  },
  {
    id: 20,
    tagName: "食材_紫色",
    name: "紫色",
    parentId: null,
    itemIds: [2],
  },
];
const categoriesById = new Map(categories.map((category) => [category.id, category]));

function ingredient(id: number, listed = true): IngredientItem {
  return {
    id,
    name: `食材${id}`,
    image: null,
    description: null,
    quality: null,
    catalogCategory: "plants",
    cropSeriesId: null,
    listed,
  };
}

function slot(
  expression: IngredientExpression | null,
  itemIds: number[] | null,
  field: RecipeSlot["field"] = 20,
): RecipeSlot {
  return {
    field,
    rawExpression: "hidden",
    expression,
    itemIds,
    quantity: null,
  };
}

function recipe(...slots: RecipeSlot[]): Recipe {
  return { slots };
}

function conditionText(tokens: RecipeConditionToken[]): string {
  return tokens
    .map((token) =>
      token.kind === "category"
        ? token.label
        : token.kind === "operator"
          ? token.value
          : token.value,
    )
    .join(" ");
}

describe("dish recipe presentation", () => {
  it("creates readable tokens while preserving nested boolean grouping", () => {
    const [view] = buildDishRecipeSlots(
      recipe(
        slot(
          {
            kind: "all",
            terms: [
              {
                kind: "any",
                terms: [
                  { kind: "category", categoryId: 10 },
                  { kind: "category", categoryId: 20 },
                ],
              },
              { kind: "category", categoryId: 30 },
            ],
          },
          [1],
        ),
      ),
      categoriesById,
      new Map(),
    );

    expect(conditionText(view!.conditionTokens)).toBe("( 蔬菜 或 紫色 ) 且 未收录类别");
    expect(view?.conditionTokens.at(-1)).toMatchObject({
      kind: "category",
      resolved: false,
    });
  });

  it("uses resolved itemIds as authoritative candidates and preserves their source order", () => {
    const items = new Map(
      [ingredient(3), ingredient(1), ingredient(2, false), ingredient(4)].map((item) => [
        item.id,
        item,
      ]),
    );
    const [view] = buildDishRecipeSlots(
      recipe(slot({ kind: "category", categoryId: 10 }, [3, 1, 3, 999, 2])),
      categoriesById,
      items,
    );

    expect(view?.candidates.map((item) => item.id)).toEqual([3, 1]);
    expect(view?.candidateStatus).toBe("ready");
    expect(conditionText(view!.conditionTokens)).toBe("蔬菜");
  });

  it("keeps known candidates when only the readable condition is unavailable", () => {
    const items = new Map([[1, ingredient(1)]]);
    const [view] = buildDishRecipeSlots(recipe(slot(null, [1])), categoriesById, items);

    expect(view).toMatchObject({
      conditionStatus: "unparsed",
      candidateStatus: "ready",
      conditionTokens: [],
    });
    expect(view?.candidates.map((item) => item.id)).toEqual([1]);
  });

  it("distinguishes unconfirmed and empty candidate lists", () => {
    const views = buildDishRecipeSlots(
      recipe(
        slot({ kind: "category", categoryId: 10 }, null, 20),
        slot({ kind: "category", categoryId: 10 }, [], 25),
      ),
      categoriesById,
      new Map(),
    );

    expect(views.map((view) => view.candidateStatus)).toEqual(["unconfirmed", "empty"]);
    expect(views.map((view) => view.field)).toEqual([20, 25]);
  });

  it("returns no slots when a recipe has no usable source data", () => {
    expect(buildDishRecipeSlots(null, categoriesById, new Map())).toEqual([]);
    expect(buildDishRecipeSlots({ slots: null }, categoriesById, new Map())).toEqual([]);
  });
});
