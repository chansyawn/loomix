import { z } from "zod";
import { createRecordSchemas, DeliveredImageSchema, ItemIdSchema } from "../records.ts";

const text = z.string().min(1).nullable();
export const ResearchSchema = z.strictObject({
  tasks: z.array(
    z.strictObject({
      kind: z.enum(["collectionCount", "collectionSize", "cooking"]),
      text: z.string().min(1),
    }),
  ),
  completionConditions: z.array(
    z.strictObject({ requiredTaskCount: ItemIdSchema, text: z.string().min(1) }),
  ),
});
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

export function createV4RecordSchemas(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const base = createRecordSchemas(image);
  return {
    ...base,
    "furniture.item": base["furniture.item"].extend({
      craftingRecipes: CraftingRecipeSchema.array().min(1).nullable(),
    }),
    "creatures.item": base["creatures.item"].extend({
      attributes: base["creatures.item"].shape.attributes.extend({
        sources: text,
        scientificName: text,
      }),
      research: ResearchSchema.nullable(),
    }),
    "plants.item": base["plants.item"].extend({
      attributes: base["plants.item"].shape.attributes.extend({ sources: text }),
      seedId: ItemIdSchema.nullable(),
    }),
    "dishes.item": base["dishes.item"].extend({
      attributes: base["dishes.item"].shape.attributes.extend({
        sources: text,
        tastes: TastesSchema.nullable(),
      }),
      difficultyRequirement: DifficultyRequirementSchema.nullable(),
    }),
    "miscellaneous.item": base["miscellaneous.item"].extend({
      attributes: base["miscellaneous.item"].shape.attributes.extend({ sources: text }),
    }),
  };
}

export function createV4RecordSchema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const s = createV4RecordSchemas(image);
  return z.union([
    s["furniture.item"],
    s["furniture.set"],
    s["clothing.item"],
    s["clothing.set"],
    s["clothing.appearance"],
    s["creatures.item"],
    s["creatures.series"],
    s["plants.item"],
    s["plants.series"],
    s["dishes.item"],
    s["dishes.series"],
    s["miscellaneous.item"],
  ]);
}
export const V4RecordSchema = createV4RecordSchema();
export type CatalogRecordV4 = z.infer<typeof V4RecordSchema>;
export type Research = z.infer<typeof ResearchSchema>;
export type DifficultyRequirement = z.infer<typeof DifficultyRequirementSchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
