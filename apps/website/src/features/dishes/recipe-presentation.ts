import type { IngredientExpression, RecipeSlot } from "@loomix/schema/catalog";
import type { IngredientItem } from "../omnidex-view";

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
  conditionTokens: RecipeConditionToken[];
  candidates: IngredientItem[];
  references: IngredientItem[];
};

function appendConditionTokens(
  expression: IngredientExpression,
  tags: ReadonlyMap<number, { name: string }>,
  tokens: RecipeConditionToken[],
  wrapComposite: boolean,
): void {
  if (expression.kind === "tag") {
    const category = tags.get(expression.tagId);
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
    appendConditionTokens(term, tags, tokens, term.kind !== "tag");
  });
  if (wrapComposite) tokens.push({ kind: "punctuation", value: ")" });
}

function conditionTokens(
  expression: IngredientExpression,
  tags: ReadonlyMap<number, { name: string }>,
): RecipeConditionToken[] {
  const tokens: RecipeConditionToken[] = [];
  appendConditionTokens(expression, tags, tokens, false);
  return tokens;
}

function candidateItems(
  itemIds: readonly number[],
  items: ReadonlyMap<number, IngredientItem>,
): IngredientItem[] {
  return [...new Set(itemIds)].flatMap((id) => {
    const item = items.get(id);
    return item ? [item] : [];
  });
}

export function buildDishRecipeSlots(
  slots: readonly RecipeSlot[],
  tags: ReadonlyMap<number, { name: string }>,
  items: ReadonlyMap<number, IngredientItem>,
): DishRecipeSlotView[] {
  return slots.map((slot) => {
    const matches = candidateItems(slot.itemIds, items);
    return {
      conditionTokens: conditionTokens(slot.expression, tags),
      candidates: matches.filter((item) => item.browsable !== false),
      references: matches.filter((item) => item.browsable === false),
    };
  });
}
