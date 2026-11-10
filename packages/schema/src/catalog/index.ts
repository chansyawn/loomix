import { z } from "zod";
import { ContextSchema, IdSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
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
export const QualitySchema = z.number().int().min(0).max(4);
export const AcquisitionSchema = z.strictObject({
  sourceId: IdSchema,
  label: z.string().min(1),
  condition: text,
});
export const TradeSchema = z.strictObject({
  sellPrice: z.number().nonnegative().nullable(),
  offers: z
    .array(
      z.strictObject({
        id: IdSchema,
        goodsGroupId: IdSchema,
        buyPrice: z.number().nonnegative().nullable(),
        currencyItemId: IdSchema.nullable(),
        stock: z.number().nonnegative().nullable(),
        refresh: text,
        conditions: z
          .array(
            z.strictObject({
              field: z.number().int().nonnegative(),
              kind: z.string().min(1),
              parameters: text,
            }),
          )
          .nullable(),
      }),
    )
    .nullable(),
});
export const DropSchema = z.strictObject({
  itemId: IdSchema,
  dropGroupId: IdSchema.nullable(),
  weight: z.number().nonnegative().nullable(),
  quantityMin: IdSchema.nullable(),
  quantityMax: IdSchema.nullable(),
  probability: z.number().min(0).max(1).nullable(),
});
export const EntityBaseSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  image: ImageRefSchema.nullable(),
  description: text,
  quality: QualitySchema.nullable(),
});
export const AdmissionReasonSchema = z.enum(["encyclopedia", "manual", "deterministicSeed"]);
export const GameplayTagGroupSchema = z.strictObject({
  field: z.union([
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(10),
    z.literal(11),
    z.literal(12),
    z.literal(13),
    z.literal(14),
    z.literal(15),
  ]),
  tagIds: IdSchema.array(),
});
export const GameplayTagSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  enumName: text,
  parentId: IdSchema.nullable(),
  displayName: text,
});
const metadata = z.strictObject({
  admissionReasons: AdmissionReasonSchema.array().min(1),
  clientType: z.number().int().nonnegative(),
  clientSecondaryType: z.number().int().nonnegative().nullable(),
  gameplayTagGroups: GameplayTagGroupSchema.array().length(10),
});
const item = EntityBaseSchema.extend({
  ...metadata.shape,
  subcategory: text,
  trade: TradeSchema.nullable(),
  acquisition: AcquisitionSchema.array().nullable(),
});
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
  gameplayTags: GameplayTagSchema.array(),
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
export type GameplayTag = z.infer<typeof GameplayTagSchema>;
export type Quality = z.infer<typeof QualitySchema>;
export const parseCatalog = (input: unknown): Catalog => CatalogSchema.parse(input);
export {
  isGroupRecord,
  recordCategory,
  recordKind,
  resolveItem,
  createTagResolver,
} from "./records.ts";
export { recordTarget, recordFocus } from "./location.ts";
