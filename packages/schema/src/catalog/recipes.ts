import { z } from "zod";
import { IdSchema as ItemIdSchema } from "../common/identity.ts";
export type IngredientExpression =
  | { kind: "category"; categoryId: number }
  | { kind: "all"; terms: IngredientExpression[] }
  | { kind: "any"; terms: IngredientExpression[] };
const ingredientExpressionSchema: z.ZodType<IngredientExpression> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("category"), categoryId: ItemIdSchema }),
    z.strictObject({ kind: z.literal("all"), terms: ingredientExpressionSchema.array().min(2) }),
    z.strictObject({ kind: z.literal("any"), terms: ingredientExpressionSchema.array().min(2) }),
  ]),
);
export const IngredientExpressionSchema = ingredientExpressionSchema;
export const RecipeSlotSchema = z.strictObject({
  field: z.union([z.literal(20), z.literal(25), z.literal(30), z.literal(35)]),
  rawExpression: z.string().min(1),
  expression: IngredientExpressionSchema.nullable(),
  itemIds: z.array(ItemIdSchema).nullable(),
  quantity: z.null(),
});
export const RecipeSchema = z.strictObject({ slots: RecipeSlotSchema.array().nullable() });
export const IngredientCategorySchema = z.strictObject({
  id: ItemIdSchema,
  tagName: z.string().min(1),
  name: z.string().min(1),
  parentId: ItemIdSchema.nullable(),
  itemIds: z.array(ItemIdSchema),
});
const text = z.string().min(1).nullable();
export const DifficultyConditionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("chefLevelGreaterOrEqual"), level: ItemIdSchema }),
  z.strictObject({ kind: z.literal("learnCookRecipeInCategory"), categoryId: ItemIdSchema }),
]);
export const DifficultyRequirementSchema = z
  .strictObject({
    rawExpression: z.string().min(1),
    condition: DifficultyConditionSchema.nullable(),
    unresolvedReason: text,
  })
  .superRefine((value, ctx) => {
    if ((value.condition === null) !== (value.unresolvedReason !== null))
      ctx.addIssue({ code: "custom", message: "Unknown conditions require a reason" });
  });
export const CraftingRecipeSchema = z
  .strictObject({
    id: ItemIdSchema,
    materials: z
      .array(z.strictObject({ itemId: ItemIdSchema, quantity: ItemIdSchema }))
      .min(1)
      .nullable(),
    unresolvedReason: text,
  })
  .superRefine((recipe, ctx) => {
    if ((recipe.materials === null) !== (recipe.unresolvedReason !== null))
      ctx.addIssue({ code: "custom", message: "Unknown crafting materials require a reason" });
  });
export const TastesSchema = z.array(z.enum(["甜", "咸"])).min(1);

export type Recipe = z.infer<typeof RecipeSchema>;
export type IngredientCategory = z.infer<typeof IngredientCategorySchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
export type DifficultyRequirement = z.infer<typeof DifficultyRequirementSchema>;
