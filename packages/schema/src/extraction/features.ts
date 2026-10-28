import { z } from "zod";
import { createRecordSchemas, DeliveredImageSchema, ItemIdSchema } from "./records.ts";
import {
  ResearchSchema,
  CraftingRecipeSchema,
  DifficultyRequirementSchema,
  TastesSchema,
} from "../catalog/recipes.ts";
export {
  ResearchSchema,
  CraftingRecipeSchema,
  DifficultyRequirementSchema,
  DifficultyConditionSchema,
  TastesSchema,
} from "../catalog/recipes.ts";
const text = z.string().min(1).nullable();
export function createObservedRecordSchemas(
  image: z.ZodType<string | null> = DeliveredImageSchema,
) {
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

export function createObservedRecordSchema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const s = createObservedRecordSchemas(image);
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
export const ObservedRecordSchema = createObservedRecordSchema();
export type CatalogRecordObserved = z.infer<typeof ObservedRecordSchema>;
export type Research = z.infer<typeof ResearchSchema>;
export type DifficultyRequirement = z.infer<typeof DifficultyRequirementSchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
