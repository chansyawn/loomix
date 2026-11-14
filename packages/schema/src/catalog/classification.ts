import { z } from "zod";
import { IdSchema } from "../common/identity.ts";

export const ClientClassificationSchema = z.strictObject({
  type: z.number().int().nonnegative(),
  idType: z.number().int().nonnegative(),
  subtype: z.number().int().nonnegative(),
  subtypeName: z.string().min(1).nullable(),
});

export const RecordTagFieldsSchema = z.strictObject({
  type: IdSchema.array(),
  showType: IdSchema.array(),
  area: IdSchema.array(),
  color: IdSchema.array(),
  creature: IdSchema.array(),
  material: IdSchema.array(),
  style: IdSchema.array(),
  property: IdSchema.array(),
  size: IdSchema.array(),
  ingredients: IdSchema.array(),
  foodMaterials: IdSchema.array(),
  npcFurnitureCategory: IdSchema.array(),
});

export const ClientTypeSchema = z.strictObject({
  id: z.number().int().nonnegative(),
  name: z.string().min(1).nullable(),
  tagIds: IdSchema.array(),
});

export const RECORD_TAG_FIELD_NAMES = [
  "type",
  "showType",
  "area",
  "color",
  "creature",
  "material",
  "style",
  "property",
  "size",
  "ingredients",
  "foodMaterials",
  "npcFurnitureCategory",
] as const;

export type RecordTagFields = z.infer<typeof RecordTagFieldsSchema>;
export type ClientType = z.infer<typeof ClientTypeSchema>;

export function mergeRecordTagIds(tagFields: RecordTagFields, typeTagIds: readonly number[]) {
  return [
    ...new Set([...RECORD_TAG_FIELD_NAMES.flatMap((field) => tagFields[field]), ...typeTagIds]),
  ];
}
