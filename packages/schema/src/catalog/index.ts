import { z } from "zod";
import { ContextSchema, IdSchema } from "../common/identity.ts";
import {
  AcquisitionSchema,
  CatalogItemBaseSchema,
  DropSchema,
  EntityBaseSchema,
  RecordMetadataSchema,
  TradeSchema,
  QualitySchema,
} from "./common.ts";
import { NeighborClothingSchema } from "./neighbor-clothing.ts";
import {
  DifficultyRequirementSchema,
  IngredientCategorySchema,
  RecipeSchema,
  TastesSchema,
  CraftingRecipeSchema,
} from "./recipes.ts";

export * from "./recipes.ts";
export * from "./growth.ts";
import { GrowthSchema } from "./growth.ts";
const text = z.string().min(1).nullable();
const texts = z.array(z.string().min(1)).nullable();
export {
  QualitySchema,
  AcquisitionSchema,
  TradeSchema,
  DropSchema,
  EntityBaseSchema,
  AdmissionReasonSchema,
} from "./common.ts";
const metadata = RecordMetadataSchema;
const item = CatalogItemBaseSchema;
export const ItemSchema = z.discriminatedUnion("type", [
  item.extend({
    type: z.literal("furniture"),
    furnitureType: text,
  }),
  item.extend({
    type: z.literal("clothing"),
  }),
  item.extend({
    type: z.literal("creature"),
    region: texts,
    habitat: texts,
    activeSeasons: texts,
    activeTimes: texts,
    activeWeather: texts,
    sizeRange: text,
    scientificName: text,
    size: z
      .strictObject({
        min: z.number().nonnegative().nullable(),
        max: z.number().nonnegative().nullable(),
        unit: text,
      })
      .nullable(),
    grades: z
      .array(
        z.strictObject({
          grade: IdSchema,
          collectionScore: IdSchema.nullable(),
          sellPrice: z.number().nonnegative().nullable(),
        }),
      )
      .nullable(),
  }),
  item.extend({
    type: z.literal("plant"),
    flowerColors: texts,
    drops: DropSchema.array().nullable(),
    hybridRecipes: z
      .array(
        z.strictObject({
          parents: z.array(z.strictObject({ itemId: IdSchema, quantity: IdSchema })).min(1),
          productId: IdSchema,
        }),
      )
      .nullable(),
  }),
  item.extend({
    type: z.literal("dish"),
    difficulty: text,
    cookware: texts,
    effectsText: text,
    tastes: TastesSchema.nullable(),
    recipe: RecipeSchema.nullable(),
    difficultyRequirement: DifficultyRequirementSchema.nullable(),
    effects: z
      .array(
        z.strictObject({
          effectId: IdSchema,
          name: text,
          description: text,
          level: IdSchema.nullable(),
          uses: IdSchema.nullable(),
          durationSeconds: IdSchema.nullable(),
        }),
      )
      .nullable(),
  }),
  item.extend({ type: z.literal("material") }),
  NeighborClothingSchema,
]);
export const GroupSchema = EntityBaseSchema.extend({
  type: z.enum([
    "furniture.set",
    "clothing.set",
    "creatures.series",
    "plants.series",
    "dishes.series",
  ]),
  memberIds: IdSchema.array().nullable(),
});
export const AppearanceSchema = EntityBaseSchema.extend({ subcategory: text });
export const SeedDataSchema = EntityBaseSchema.extend({
  growthId: IdSchema,
  trade: TradeSchema.nullable(),
  acquisition: AcquisitionSchema.array().nullable(),
});
export const RecordSchema = z.discriminatedUnion("type", [
  ...ItemSchema.options,
  GroupSchema.extend({ ...metadata.shape, acquisition: AcquisitionSchema.array().nullable() }),
  AppearanceSchema.extend({
    ...metadata.shape,
    type: z.literal("appearance"),
    acquisition: AcquisitionSchema.array().nullable(),
  }),
  SeedDataSchema.extend({ ...metadata.shape, type: z.literal("seed") }),
]);
export const ItemReferenceSchema = z.strictObject({ id: IdSchema, name: z.string().min(1) });
export const CatalogSchema = ContextSchema.extend({
  kind: z.literal("catalog"),
  records: RecordSchema.array(),
  references: ItemReferenceSchema.array(),
  craftingRecipes: CraftingRecipeSchema.extend({
    productId: IdSchema,
    quantity: IdSchema.nullable(),
  }).array(),
  growths: GrowthSchema.array(),
  ingredientCategories: IngredientCategorySchema.array(),
});
export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogRecord = z.infer<typeof RecordSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Seed = Extract<CatalogRecord, { type: "seed" }>;
export type ItemReference = z.infer<typeof ItemReferenceSchema>;
export type Quality = z.infer<typeof QualitySchema>;
export { NeighborClothingSchema } from "./neighbor-clothing.ts";
export type { NeighborClothing } from "./neighbor-clothing.ts";
export const parseCatalog = (input: unknown): Catalog => CatalogSchema.parse(input);
export { isGroupRecord, recordCategory, resolveItem } from "./records.ts";
export { recordTarget, recordFocus } from "./location.ts";

export { createRecordTagResolver } from "./tags.ts";
