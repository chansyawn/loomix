import { z } from "zod";
import { ContextSchema, IdSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
import {
  DifficultyRequirementSchema,
  IngredientCategorySchema,
  RecipeSchema,
  TastesSchema,
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
const item = EntityBaseSchema.extend({
  subcategory: text,
  trade: TradeSchema.nullable(),
  acquisition: AcquisitionSchema.array().nullable(),
});
export const ItemSchema = z.discriminatedUnion("type", [
  item.extend({
    type: z.literal("craftingCard"),
    setId: IdSchema.nullable(),
    neighborIds: IdSchema.array(),
    artwork: z.strictObject({
      bag: ImageRefSchema.nullable(),
      back: ImageRefSchema.nullable(),
      background: ImageRefSchema.nullable(),
    }),
    recipe: z
      .strictObject({
        productId: IdSchema,
        quantity: IdSchema.nullable(),
        materials: z
          .array(z.strictObject({ itemId: IdSchema, quantity: IdSchema }))
          .min(1)
          .nullable(),
        unresolvedReason: text,
      })
      .nullable(),
  }),
  item.extend({
    type: z.literal("furniture"),
    furnitureType: text,
    size: text,
    colors: texts,
    materials: texts,
  }),
  item.extend({
    type: z.literal("clothing"),
    colors: texts,
    materials: texts,
    styles: texts,
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
    origins: texts,
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
    galaxyFlavor: text,
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
export const CardSetSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  acquisitionHint: text,
  artwork: z.strictObject({
    cover: ImageRefSchema.nullable(),
    bag: ImageRefSchema.nullable(),
    back: ImageRefSchema.nullable(),
    background: ImageRefSchema.nullable(),
    icon: ImageRefSchema.nullable(),
    lockedBackground: ImageRefSchema.nullable(),
    unlockedBackground: ImageRefSchema.nullable(),
  }),
});
export const AppearanceSchema = EntityBaseSchema.extend({ subcategory: text });
export const SeedSchema = EntityBaseSchema.extend({
  growthId: IdSchema,
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
  cardSets: CardSetSchema.array(),
  appearances: AppearanceSchema.array(),
  seeds: SeedSchema.array(),
  growths: GrowthSchema.array(),
  ingredientCategories: IngredientCategorySchema.array(),
  entries: EntrySchema.array(),
});
export type Catalog = z.infer<typeof CatalogSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type CardSet = z.infer<typeof CardSetSchema>;
export type Seed = z.infer<typeof SeedSchema>;
export type Quality = z.infer<typeof QualitySchema>;
export const parseCatalog = (input: unknown): Catalog => CatalogSchema.parse(input);
