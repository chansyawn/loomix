import { z } from "zod";
import { IdSchema, NullableTextSchema } from "../common/identity.ts";

export type IngredientExpression =
  | { kind: "tag"; tagId: number }
  | { kind: "all"; terms: IngredientExpression[] }
  | { kind: "any"; terms: IngredientExpression[] };
export const IngredientExpressionSchema: z.ZodType<IngredientExpression> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("tag"), tagId: IdSchema }),
    z.strictObject({ kind: z.literal("all"), terms: IngredientExpressionSchema.array().min(2) }),
    z.strictObject({ kind: z.literal("any"), terms: IngredientExpressionSchema.array().min(2) }),
  ]),
);
export const RecipeSlotSchema = z.strictObject({
  expression: IngredientExpressionSchema,
  itemIds: IdSchema.array(),
});
export const UnlockConditionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("chefLevelGreaterOrEqual"), level: IdSchema }),
  z.strictObject({ kind: z.literal("learnCookRecipeInCategory"), categoryId: IdSchema }),
]);
export const TastesSchema = z.array(z.enum(["甜", "咸"])).min(1);
export const CookingRecipeSchema = z.strictObject({
  difficulty: NullableTextSchema,
  unlockCondition: UnlockConditionSchema.nullable(),
  cookware: NullableTextSchema,
  tastes: TastesSchema.nullable(),
  slots: RecipeSlotSchema.array(),
});
export const ItemAmountSchema = z.strictObject({ itemId: IdSchema, quantity: IdSchema });
export const CraftingRecipeSchema = z.strictObject({
  id: IdSchema,
  materials: ItemAmountSchema.array().min(1).nullable(),
});

export type RecipeSlot = z.infer<typeof RecipeSlotSchema>;
export type UnlockCondition = z.infer<typeof UnlockConditionSchema>;
export type CookingRecipe = z.infer<typeof CookingRecipeSchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
export type ItemAmount = z.infer<typeof ItemAmountSchema>;

export function ingredientExpressionTagIds(expression: IngredientExpression): number[] {
  return expression.kind === "tag"
    ? [expression.tagId]
    : expression.terms.flatMap(ingredientExpressionTagIds);
}
