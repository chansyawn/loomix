import type { SourceProof } from "../../model.ts";
import type { CookingContext } from "./cooking.ts";
import { localizedSources, tableSource } from "./collection/evidence.ts";
import type { ObservedCookingRecipe } from "../../schemas/observed.ts";

// 证据挂在菜肴的内嵌字段上，与发布契约中 cooking 的位置一致。
const publishedFields = ["difficulty", "unlockCondition", "cookware", "tastes", "slots"] as const;

export function cookingEvidence(
  context: CookingContext,
  recipes: ObservedCookingRecipe[],
): SourceProof[] {
  return recipes.flatMap((recipe) => {
    const row = context.recipesByProduct.get(recipe.productId)!;
    const difficulty = context.vocabulary.difficulties.get(context.tables.uint(row, 2));
    const sources = [
      tableSource(context.tables, row, [0, 2, 4, 15, 16, 20, 25, 30, 35]),
      ...(difficulty
        ? [
            tableSource(context.tables, difficulty, [0, 2]),
            ...localizedSources(context.tables, difficulty, [1]),
          ]
        : []),
      ...context.vocabulary.cookware
        .filter((entry) => context.tables.uint(entry, 2) === context.tables.uint(row, 16))
        .map((entry) => tableSource(context.tables, entry, [1, 2])),
    ].map(({ file, table, rowOffset, fields }) => ({
      kind: "table" as const,
      file,
      table,
      rowOffset,
      fields,
    }));
    return publishedFields.map((field): SourceProof => {
      const value = recipe[field];
      const reason =
        field === "slots"
          ? "ingredient_slot_runtime_semantics_unconfirmed"
          : value === null
            ? "cooking_field_not_configured"
            : null;
      return {
        owner: "item",
        id: recipe.productId,
        field: `cooking.${field}`,
        status: field === "slots" ? "unresolved" : value === null ? "absent" : "confirmed",
        ruleId: "client.cooking.config",
        reasonCode: reason,
        sources,
      };
    });
  });
}
