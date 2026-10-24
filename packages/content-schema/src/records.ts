import { z } from "zod";

export const CategorySchema = z.enum([
  "furniture",
  "clothing",
  "creatures",
  "plants",
  "dishes",
  "miscellaneous",
]);
export const ItemIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const CatalogSourceSchema = z.strictObject({
  gameVersion: z.string().min(1),
  dataRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  resourceRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
const text = z.string().nullable();
const members = z.array(ItemIdSchema).nullable();
export const DeliveredImageSchema = z
  .string()
  .regex(/^assets\/[a-f0-9]{64}\.webp$/)
  .nullable();
export const attributeSchemas = {
  furniture: z.strictObject({
    type: text,
    size: text,
    colors: text,
    materials: text,
    sources: text,
  }),
  clothing: z.strictObject({ colors: text, materials: text, styles: text, sources: text }),
  creatures: z.strictObject({
    region: text,
    habitat: text,
    activeSeasons: text,
    activeTimes: text,
    activeWeather: text,
    sizeRange: text,
  }),
  plants: z.strictObject({
    originGalaxy: text,
    maturityPeriod: text,
    harvestCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  }),
  dishes: z.strictObject({ difficulty: text, galaxyFlavor: text, cookware: text, effects: text }),
  miscellaneous: z.strictObject({}),
};
export function createRecordSchemas(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const base = z.strictObject({
    id: ItemIdSchema,
    name: z.string().min(1),
    image,
    description: text,
    quality: z
      .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .nullable(),
    encyclopediaEntry: z.strictObject({ listed: z.boolean() }).nullable(),
  });
  function item<C extends Category>(category: C) {
    return base.extend({
      category: z.literal(category),
      kind: z.literal("item"),
      subcategory: text,
      attributes: attributeSchemas[category],
    });
  }
  function collection<C extends Category, K extends "set" | "series">(category: C, kind: K) {
    return base.extend({
      category: z.literal(category),
      kind: z.literal(kind),
      memberIds: members,
    });
  }
  return {
    "furniture.item": item("furniture"),
    "furniture.set": collection("furniture", "set"),
    "clothing.item": item("clothing"),
    "clothing.set": collection("clothing", "set"),
    "clothing.appearance": base.extend({
      category: z.literal("clothing"),
      kind: z.literal("appearance"),
      subcategory: text,
    }),
    "creatures.item": item("creatures"),
    "creatures.series": collection("creatures", "series"),
    "plants.item": item("plants"),
    "plants.series": collection("plants", "series"),
    "dishes.item": item("dishes"),
    "dishes.series": collection("dishes", "series"),
    "miscellaneous.item": item("miscellaneous"),
  };
}
export const recordSchemas = createRecordSchemas();
export function createCatalogRecordSchema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const s = createRecordSchemas(image);
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
export const CatalogRecordSchema = createCatalogRecordSchema();
export type Category = z.infer<typeof CategorySchema>;
export type ItemId = number;
export type NullableText = string | null;
export type Quality = 0 | 1 | 2 | 3 | 4;
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;
export type CatalogRecord = z.infer<typeof CatalogRecordSchema>;
export type ItemRecord = Extract<CatalogRecord, { kind: "item" }>;
export type SetRecord = Extract<CatalogRecord, { kind: "set" }>;
export type SeriesRecord = Extract<CatalogRecord, { kind: "series" }>;
export type AppearanceRecord = Extract<CatalogRecord, { kind: "appearance" }>;
export type RecordKind = CatalogRecord["kind"];
export type RecordBase = Pick<
  CatalogRecord,
  "id" | "name" | "image" | "description" | "quality" | "encyclopediaEntry"
>;
export type RecordType = keyof typeof recordSchemas;
export type AttributesByCategory = { [C in Category]: z.infer<(typeof attributeSchemas)[C]> };
