import { z } from "zod";
import { IdSchema, NullableTextSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
import { GrowthSchema } from "./growth.ts";
import { CookingRecipeSchema, CraftingRecipeSchema } from "./recipes.ts";

const texts = z.string().min(1).array().nullable();

export const QualitySchema = z.number().int().min(0).max(4);
export const BodyTypeSchema = z.enum(["small", "medium", "big"]);
export const AcquisitionSchema = z.strictObject({ sourceId: IdSchema, label: z.string().min(1) });
export const DropSchema = z.strictObject({
  itemId: IdSchema,
  source: z.enum(["fruit", "felling"]),
});
export const DishEffectSchema = z.strictObject({
  effectId: IdSchema,
  name: NullableTextSchema,
  description: NullableTextSchema,
  level: IdSchema.nullable(),
  uses: IdSchema.nullable(),
  durationSeconds: IdSchema.nullable(),
});

const listed = {
  id: IdSchema,
  name: z.string().min(1),
  description: NullableTextSchema,
  image: ImageRefSchema.nullable(),
  quality: QualitySchema.nullable(),
  acquisition: AcquisitionSchema.array().min(1).nullable(),
};
const item = z.strictObject({ ...listed, tagIds: IdSchema.array() });
const categorized = item.extend({ category: NullableTextSchema });

export const ItemSchema = z.discriminatedUnion("kind", [
  categorized.extend({
    kind: z.literal("furniture"),
    furnitureCategory: NullableTextSchema,
    size: z.strictObject({ width: z.number().positive(), depth: z.number().positive() }).nullable(),
    craftingRecipes: CraftingRecipeSchema.array(),
  }),
  categorized.extend({ kind: z.literal("clothing") }),
  categorized.extend({ kind: z.literal("appearance") }),
  categorized.extend({
    kind: z.literal("neighborClothing"),
    neighborId: IdSchema.nullable(),
    playerItemId: IdSchema.nullable(),
    bodyTypes: BodyTypeSchema.array().min(1),
    price: z.number().nonnegative().nullable(),
  }),
  categorized.extend({
    kind: z.literal("creature"),
    scientificName: NullableTextSchema,
    region: texts,
    habitat: texts,
    activeSeasons: texts,
    activeTimes: texts,
    activeWeather: texts,
    size: z
      .strictObject({
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
        unit: z.string().min(1),
      })
      .nullable(),
  }),
  categorized.extend({
    kind: z.literal("plant"),
    flowerColors: texts,
    drops: DropSchema.array().min(1).nullable(),
  }),
  item.extend({ kind: z.literal("seed"), growth: GrowthSchema }),
  item.extend({
    kind: z.literal("dish"),
    strength: z.number().int().positive().nullable(),
    effects: DishEffectSchema.array().min(1).nullable(),
    cooking: CookingRecipeSchema.nullable(),
  }),
  item.extend({ kind: z.literal("material") }),
  // 仅被正式数据引用、未收录为图鉴条目的物品。
  z.strictObject({
    kind: z.literal("reference"),
    id: IdSchema,
    name: z.string().min(1),
    description: NullableTextSchema,
  }),
]);

export const CollectionMemberKindSchema = z.enum([
  "furniture",
  "clothing",
  "creature",
  "plant",
  "dish",
]);
export const CollectionSchema = z.strictObject({
  ...listed,
  memberKind: CollectionMemberKindSchema,
  memberIds: IdSchema.array().nullable(),
});

export type Quality = z.infer<typeof QualitySchema>;
export type BodyType = z.infer<typeof BodyTypeSchema>;
export type Acquisition = z.infer<typeof AcquisitionSchema>;
export type Drop = z.infer<typeof DropSchema>;
export type DishEffect = z.infer<typeof DishEffectSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ItemKind = Item["kind"];
export type ItemOf<K extends ItemKind> = Extract<Item, { kind: K }>;
export type ListedItem = Exclude<Item, { kind: "reference" }>;
export type Collection = z.infer<typeof CollectionSchema>;
export type CollectionMemberKind = z.infer<typeof CollectionMemberKindSchema>;

export const isListedItem = (item: Item): item is ListedItem => item.kind !== "reference";
