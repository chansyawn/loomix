import { z } from "zod";
import { createRecordSchemas, DeliveredImageSchema } from "./records.ts";
import { ObservedCraftingRecipeSchema } from "../../schemas/observed.ts";
export { TastesSchema, UnlockConditionSchema } from "@loomix/schema/catalog";
export type { UnlockCondition } from "@loomix/schema/catalog";
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
    "plants.item": base["plants.item"],
    "dishes.item": base["dishes.item"],
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
export type CraftingRecipe = z.infer<typeof ObservedCraftingRecipeSchema>;
