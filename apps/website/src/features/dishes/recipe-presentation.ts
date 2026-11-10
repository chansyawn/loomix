import type { IngredientExpression, Recipe } from "@loomix/schema/catalog";
import type { IngredientCategory } from "../ingredients/category";
import type { IngredientItem } from "../collection-view";

type RecipeSlot = NonNullable<Recipe["slots"]>[number];

export type RecipeConditionToken =
  | {
      kind: "tag";
      tagId: number;
      label: string;
      resolved: boolean;
    }
  | { kind: "operator"; value: "且" | "或" }
  | { kind: "punctuation"; value: "(" | ")" };

export type DishRecipeSlotView = {
  field: RecipeSlot["field"];
  conditionTokens: RecipeConditionToken[];
  candidates: IngredientItem[];
  conditionStatus: "ready" | "unparsed";
  candidateStatus: "ready" | "unconfirmed" | "empty";
};

function appendConditionTokens(
  expression: IngredientExpression,
  categories: ReadonlyMap<number, IngredientCategory>,
  tokens: RecipeConditionToken[],
  wrapComposite: boolean,
): void {
  if (expression.kind === "tag") {
    const category = categories.get(expression.tagId);
    tokens.push({
      kind: "tag",
      tagId: expression.tagId,
      label: category?.name ?? "未收录类别",
      resolved: category !== undefined,
    });
    return;
  }

  if (wrapComposite) tokens.push({ kind: "punctuation", value: "(" });
  expression.terms.forEach((term, index) => {
    if (index > 0)
      tokens.push({
        kind: "operator",
        value: expression.kind === "all" ? "且" : "或",
      });
    appendConditionTokens(term, categories, tokens, term.kind !== "tag");
  });
  if (wrapComposite) tokens.push({ kind: "punctuation", value: ")" });
}

function conditionTokens(
  expression: IngredientExpression,
  categories: ReadonlyMap<number, IngredientCategory>,
): RecipeConditionToken[] {
  const tokens: RecipeConditionToken[] = [];
  appendConditionTokens(expression, categories, tokens, false);
  return tokens;
}

function candidateItems(
  itemIds: readonly number[] | null,
  items: ReadonlyMap<number, IngredientItem>,
): IngredientItem[] {
  if (itemIds === null) return [];
  return [...new Set(itemIds)].flatMap((id) => {
    const item = items.get(id);
    return item && item.listed !== false ? [item] : [];
  });
}

export function buildDishRecipeSlots(
  recipe: Recipe | null,
  categories: ReadonlyMap<number, IngredientCategory>,
  items: ReadonlyMap<number, IngredientItem>,
): DishRecipeSlotView[] {
  return (
    recipe?.slots?.map((slot) => {
      const candidates = candidateItems(slot.itemIds, items);
      return {
        field: slot.field,
        conditionTokens:
          slot.expression === null ? [] : conditionTokens(slot.expression, categories),
        candidates,
        conditionStatus: slot.expression === null ? "unparsed" : "ready",
        candidateStatus:
          slot.itemIds === null ? "unconfirmed" : candidates.length > 0 ? "ready" : "empty",
      };
    }) ?? []
  );
}
