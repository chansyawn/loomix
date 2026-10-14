import { z } from "zod";

const text = z.string().nullable();
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const members = z.array(id).nullable();

export const BasicRecordSchema = z.strictObject({
  name: z.string().min(1),
  image: z
    .string()
    .regex(/^assets\/[a-f0-9]{64}\.png$/)
    .nullable(),
  description: text,
  id,
  quality: z.number().int().min(0).max(4).nullable(),
});

export const FurnitureSetSchema = BasicRecordSchema.extend({
  seriesName: text,
  componentIds: members,
});
export const FurnitureItemSchema = BasicRecordSchema.extend({
  category: text,
  type: text,
  size: text,
  colors: text,
  materials: text,
  sources: text,
});
export const CreatureSeriesSchema = BasicRecordSchema.extend({
  seriesName: text,
  creatureIds: members,
});
export const CreatureItemSchema = BasicRecordSchema.extend({
  category: text,
  region: text,
  habitat: text,
  activeSeasons: text,
  activeTimes: text,
  activeWeather: text,
  sizeRange: text,
});
export const PlantSeriesSchema = BasicRecordSchema.extend({
  seriesName: text,
  plantIds: members,
});
export const PlantItemSchema = BasicRecordSchema.extend({
  category: text,
  originGalaxy: text,
  maturityPeriod: text,
  harvestCount: z.number().int().nonnegative().nullable(),
});
export const DishSeriesSchema = BasicRecordSchema.extend({
  seriesName: text,
  dishIds: members,
});
export const DishItemSchema = BasicRecordSchema.extend({
  difficulty: text,
  galaxyFlavor: text,
  cookware: text,
  effects: text,
});
export const ClothingSetSchema = BasicRecordSchema.extend({
  setName: text,
  componentIds: members,
});
export const ClothingItemSchema = BasicRecordSchema.extend({
  category: text,
  colors: text,
  materials: text,
  styles: text,
  sources: text,
});
export const ClothingAppearanceSchema = BasicRecordSchema.extend({ category: text });
export const MiscellaneousItemSchema = BasicRecordSchema;

export const recordSchemas = {
  "furniture.sets": FurnitureSetSchema,
  "furniture.items": FurnitureItemSchema,
  "creatures.series": CreatureSeriesSchema,
  "creatures.items": CreatureItemSchema,
  "plants.series": PlantSeriesSchema,
  "plants.items": PlantItemSchema,
  "dishes.series": DishSeriesSchema,
  "dishes.items": DishItemSchema,
  "clothing.sets": ClothingSetSchema,
  "clothing.items": ClothingItemSchema,
  "clothing.appearances": ClothingAppearanceSchema,
  miscellaneous: MiscellaneousItemSchema,
};

export type BasicRecord = z.infer<typeof BasicRecordSchema>;
export type FurnitureSet = z.infer<typeof FurnitureSetSchema>;
export type FurnitureItem = z.infer<typeof FurnitureItemSchema>;
export type CreatureSeries = z.infer<typeof CreatureSeriesSchema>;
export type CreatureItem = z.infer<typeof CreatureItemSchema>;
export type PlantSeries = z.infer<typeof PlantSeriesSchema>;
export type PlantItem = z.infer<typeof PlantItemSchema>;
export type DishSeries = z.infer<typeof DishSeriesSchema>;
export type DishItem = z.infer<typeof DishItemSchema>;
export type ClothingSet = z.infer<typeof ClothingSetSchema>;
export type ClothingItem = z.infer<typeof ClothingItemSchema>;
export type ClothingAppearance = z.infer<typeof ClothingAppearanceSchema>;
export type MiscellaneousItem = z.infer<typeof MiscellaneousItemSchema>;
export type ContentGroup = keyof typeof recordSchemas;
export type ContentRecord<G extends ContentGroup = ContentGroup> = z.infer<
  (typeof recordSchemas)[G]
>;
