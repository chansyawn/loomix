import { z } from "zod";
import { ContextSchema, IdSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
import {
  CraftingRecipeSchema,
  DifficultyRequirementSchema,
  IngredientCategorySchema,
  RecipeSchema,
  TastesSchema,
} from "./recipes.ts";

export * from "./recipes.ts";
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
export const GrowthSchema = z.strictObject({
  id: IdSchema,
  cycleMode: text,
  stageIds: IdSchema.array().nullable(),
  regrowthStageIds: IdSchema.array().nullable(),
  stages: z
    .array(z.strictObject({ id: IdSchema, name: text, image: ImageRefSchema.nullable() }))
    .nullable(),
  matureStages: z
    .array(z.strictObject({ entityId: IdSchema, productId: IdSchema, tag: text, rank: text }))
    .nullable(),
  witheredStageId: IdSchema.nullable(),
  maturityDays: IdSchema.nullable(),
  harvestCount: IdSchema.nullable(),
});
export const EntityBaseSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  image: ImageRefSchema.nullable(),
  description: text,
  quality: QualitySchema.nullable(),
});
const item = EntityBaseSchema.extend({
  subcategory: text,
  trade: TradeSchema.nullable(),
  acquisition: AcquisitionSchema.array().nullable(),
});
export const ItemSchema = z.discriminatedUnion("type", [
  item.extend({
    type: z.literal("furniture"),
    furnitureType: text,
    size: text,
    colors: texts,
    materials: texts,
    sources: texts,
    craftingRecipes: CraftingRecipeSchema.array().nullable(),
  }),
  item.extend({
    type: z.literal("clothing"),
    colors: texts,
    materials: texts,
    styles: texts,
    sources: texts,
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
    sources: texts,
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
    origins: texts,
    maturityPeriod: text,
    harvestCount: z.number().int().nonnegative().nullable(),
    sources: texts,
    flowerColors: texts,
    growthId: IdSchema.nullable(),
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
    galaxyFlavor: text,
    cookware: texts,
    sources: texts,
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
  item.extend({ type: z.literal("material"), sources: texts }),
  EntityBaseSchema.extend({ type: z.literal("reference") }),
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
export const SeedSchema = EntityBaseSchema.extend({
  productIds: IdSchema.array().min(1),
  growthId: IdSchema.nullable(),
  trade: TradeSchema.nullable(),
  acquisition: AcquisitionSchema.array().nullable(),
});
export const EntrySchema = z.strictObject({
  entity: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("item"), id: IdSchema }),
    z.strictObject({ kind: z.literal("group"), id: IdSchema }),
    z.strictObject({ kind: z.literal("appearance"), id: IdSchema }),
  ]),
  encyclopedia: z.strictObject({ listed: z.boolean() }).nullable(),
});
export const CatalogSchema = ContextSchema.extend({
  kind: z.literal("catalog"),
  items: ItemSchema.array(),
  groups: GroupSchema.array(),
  appearances: AppearanceSchema.array(),
  seeds: SeedSchema.array(),
  growths: GrowthSchema.array(),
  ingredientCategories: IngredientCategorySchema.array(),
  entries: EntrySchema.array(),
});
export type Catalog = z.infer<typeof CatalogSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Seed = z.infer<typeof SeedSchema>;
export type Growth = z.infer<typeof GrowthSchema>;
export type Quality = z.infer<typeof QualitySchema>;
export const parseCatalog = (input: unknown): Catalog => CatalogSchema.parse(input);
