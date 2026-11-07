import { z } from "zod";
import { createRecordSchemas, DeliveredImageSchema, ItemIdSchema } from "./records.ts";
import {
  CraftingRecipeSchema,
  DifficultyRequirementSchema,
  TastesSchema,
} from "@loomix/schema/catalog";
export {
  CraftingRecipeSchema,
  DifficultyRequirementSchema,
  DifficultyConditionSchema,
  TastesSchema,
} from "@loomix/schema/catalog";
const text = z.string().min(1).nullable();
export function createObservedRecordSchemas(
  image: z.ZodType<string | null> = DeliveredImageSchema,
) {
  const base = createRecordSchemas(image);
  return {
    ...base,
    "creatures.item": base["creatures.item"].extend({
      attributes: base["creatures.item"].shape.attributes.extend({
        scientificName: text,
      }),
    }),
    "plants.item": base["plants.item"].extend({
      seedId: ItemIdSchema.nullable(),
    }),
    "dishes.item": base["dishes.item"].extend({
      attributes: base["dishes.item"].shape.attributes.extend({
        tastes: TastesSchema.nullable(),
      }),
      difficultyRequirement: DifficultyRequirementSchema.nullable(),
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
export type DifficultyRequirement = z.infer<typeof DifficultyRequirementSchema>;
export type CraftingRecipe = z.infer<typeof CraftingRecipeSchema>;
