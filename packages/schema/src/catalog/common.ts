import { z } from "zod";
import { IdSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";

const text = z.string().min(1).nullable();

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
export const AdmissionReasonSchema = z.enum([
  "encyclopedia",
  "manual",
  "deterministicSeed",
  "neighborClothing",
]);
export const RecordMetadataSchema = z.strictObject({
  admissionReasons: AdmissionReasonSchema.array().min(1),
  clientType: z.number().int().nonnegative(),
  clientSecondaryType: z.number().int().nonnegative().nullable(),
  tagIds: IdSchema.array(),
});
export const CatalogItemBaseSchema = EntityBaseSchema.extend({
  ...RecordMetadataSchema.shape,
  subcategory: text,
  trade: TradeSchema.nullable(),
  acquisition: AcquisitionSchema.array().nullable(),
});
export type Quality = z.infer<typeof QualitySchema>;
export type AdmissionReason = z.infer<typeof AdmissionReasonSchema>;
export type CatalogItemBase = z.infer<typeof CatalogItemBaseSchema>;
export type Trade = z.infer<typeof TradeSchema>;
export type Acquisition = z.infer<typeof AcquisitionSchema>;
export type Drop = z.infer<typeof DropSchema>;
