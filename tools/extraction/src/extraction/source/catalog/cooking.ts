import type { ContentContext } from "./context.ts";
import { recipeSlots } from "./recipes.ts";
import { parseUnlockCondition } from "./collection/conditions.ts";
import { TastesSchema } from "@loomix/schema/catalog";
import type { ObservedCookingRecipe } from "../../schemas/observed.ts";

export type CookingContext = Pick<
  ContentContext,
  "tables" | "recipesByProduct" | "ingredientCategoryBuild"
> & { vocabulary: Pick<ContentContext["vocabulary"], "difficulties" | "cookware"> };

export function readCookingRecipes(context: CookingContext): ObservedCookingRecipe[] {
  const { tables, vocabulary, ingredientCategoryBuild } = context;
  const categories = new Map(
    ingredientCategoryBuild.categories.map((category) => [category.id, category]),
  );
  return [...context.recipesByProduct.values()]
    .map((row) => {
      const difficulty = vocabulary.difficulties.get(tables.uint(row, 2));
      const rawCondition = tables.string(difficulty, 2);
      const cookware = vocabulary.cookware.filter(
        (entry) => tables.uint(entry, 2) === tables.uint(row, 16),
      );
      const rawTaste = tables.string(row, 15);
      return {
        id: tables.id(row),
        productId: tables.uint(row, 4)!,
        difficulty: tables.text(difficulty, 1),
        unlockCondition: rawCondition ? parseUnlockCondition(rawCondition) : null,
        cookware: cookware.length === 1 ? tables.string(cookware[0], 1) : null,
        tastes: rawTaste ? TastesSchema.parse([...new Set(rawTaste.split("|"))]) : null,
        slots: recipeSlots(row, tables, ingredientCategoryBuild.byTagName, categories).slots,
      };
    })
    .sort((a, b) => a.id - b.id);
}
