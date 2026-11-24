import type { IngredientExpression, RecipeSlot } from "@loomix/schema/catalog";
import { describe, expect, it } from "vite-plus/test";
import type { IngredientItem } from "../omnidex-view";
import { buildDishRecipeSlots, type RecipeConditionToken } from "./recipe-presentation";

const tagLabels = new Map([
  [10, { name: "蔬菜" }],
  [20, { name: "紫色" }],
]);

function ingredient(id: number, browsable = true): IngredientItem {
  return {
    id,
    name: `食材${id}`,
    image: null,
    description: null,
    quality: null,
    catalogCategory: "plants",
    browsable,
  };
}

const slot = (expression: IngredientExpression, itemIds: number[]): RecipeSlot => ({
  expression,
  itemIds,
});

function conditionText(tokens: RecipeConditionToken[]): string {
  return tokens.map((token) => (token.kind === "tag" ? token.label : token.value)).join(" ");
}

describe("dish recipe presentation", () => {
  it("creates readable tokens while preserving nested boolean grouping", () => {
    const [view] = buildDishRecipeSlots(
      [
        slot(
          {
            kind: "all",
            terms: [
              {
                kind: "any",
                terms: [
                  { kind: "tag", tagId: 10 },
                  { kind: "tag", tagId: 20 },
                ],
              },
              { kind: "tag", tagId: 30 },
            ],
          },
          [1],
        ),
      ],
      tagLabels,
      new Map(),
    );

    expect(conditionText(view!.conditionTokens)).toBe("( 蔬菜 或 紫色 ) 且 未收录类别");
    expect(view?.conditionTokens.at(-1)).toMatchObject({ kind: "tag", resolved: false });
  });

  it("uses resolved itemIds as authoritative candidates and preserves their source order", () => {
    const items = new Map(
      [ingredient(3), ingredient(1), ingredient(2, false), ingredient(4)].map((item) => [
        item.id,
        item,
      ]),
    );
    const [view] = buildDishRecipeSlots(
      [slot({ kind: "tag", tagId: 10 }, [3, 1, 3, 999, 2])],
      tagLabels,
      items,
    );

    expect(view?.candidates.map((item) => item.id)).toEqual([3, 1]);
    expect(view?.references.map((item) => item.id)).toEqual([2]);
    expect(conditionText(view!.conditionTokens)).toBe("蔬菜");
  });

  it("keeps empty candidate lists and returns no slots for dishes without recipes", () => {
    const views = buildDishRecipeSlots(
      [slot({ kind: "tag", tagId: 10 }, [])],
      tagLabels,
      new Map(),
    );
    expect(views.map((view) => view.candidates)).toEqual([[]]);
    expect(buildDishRecipeSlots([], tagLabels, new Map())).toEqual([]);
  });
});
