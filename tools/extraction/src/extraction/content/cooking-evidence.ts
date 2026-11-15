import type { CookingRecipe } from "@loomix/schema/catalog";
import type { FieldEvidence } from "../evidence/domain-schema.ts";
import type { CookingContext } from "./cooking.ts";
import { localizedSources, tableSource } from "../collection/evidence.ts";

export function cookingEvidence(
  context: CookingContext,
  recipes: CookingRecipe[],
): FieldEvidence[] {
  return recipes.flatMap((recipe) => {
    const row = context.recipesByProduct.get(recipe.productId)!;
    const difficulty = context.vocabulary.difficulties.get(context.tables.uint(row, 2));
    return Object.keys(recipe).map((fieldPath): FieldEvidence => {
      const reason =
        fieldPath === "recipeItemId"
          ? "recipe_item_key_semantics_unconfirmed"
          : fieldPath === "slots"
            ? "ingredient_slot_runtime_semantics_unconfirmed"
            : null;
      return {
        entity: { collection: "catalog.cookingRecipes", id: recipe.id },
        fieldPath,
        status: reason
          ? "unresolved"
          : Reflect.get(recipe, fieldPath) === null
            ? "absent"
            : "confirmed",
        ruleId: "client.cooking.config",
        reasonCode:
          reason ??
          (Reflect.get(recipe, fieldPath) === null ? "cooking_field_not_configured" : null),
        sources: [
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
          kind: "table",
          file,
          table,
          rowOffset,
          fields,
        })),
      };
    });
  });
}
