import { z } from "zod";
import {
  DropSchema as drop,
  TradeSchema as trade,
  AcquisitionSchema as acquisition,
} from "../catalog/index.ts";
import { createCatalogSchema } from "./content.ts";
import { createObservedRecordSchema } from "./features.ts";
import { baseObservations, validateObservedRelations } from "./collection-relations.ts";
import { CatalogSourceSchema, IngredientCategorySchema } from "./records.ts";
import { ItemIdSchema, DeliveredImageSchema } from "./records.ts";
import type { Catalog } from "./content.ts";

const text = z.string().min(1).nullable();
const positive = ItemIdSchema;
function createGrowthSchema(image: z.ZodType<string | null>) {
  return z.strictObject({
    cycleMode: text,
    stageIds: z.array(positive).nullable(),
    regrowthStageIds: z.array(positive).nullable(),
    stages: z
      .array(
        z.strictObject({
          id: positive,
          name: text,
          image,
        }),
      )
      .nullable(),
    matureStages: z
      .array(
        z.strictObject({
          entityId: positive,
          productId: positive,
          tag: text,
          rank: text,
        }),
      )
      .nullable(),
    witheredStageId: positive.nullable(),
    maturityDays: positive.nullable(),
    harvestCount: positive.nullable(),
  });
}

export const GrowthSchema = createGrowthSchema(DeliveredImageSchema);

function createCollectionDetailSchema(image: z.ZodType<string | null>) {
  const growth = createGrowthSchema(image);
  return z.strictObject({
    id: positive,
    flowerColors: z.array(z.string().min(1)).nullable(),
    hybridRecipes: z
      .array(
        z.strictObject({
          parents: z.array(z.strictObject({ itemId: positive, quantity: positive })).min(1),
          productId: positive,
        }),
      )
      .nullable(),
    growth: growth.nullable(),
    treeDrops: z.array(drop).nullable(),
    creatureSize: z
      .strictObject({
        min: z.number().nonnegative().nullable(),
        max: z.number().nonnegative().nullable(),
        unit: text,
      })
      .nullable(),
    creatureGrades: z
      .array(
        z.strictObject({
          grade: positive,
          collectionScore: positive.nullable(),
          sellPrice: z.number().nonnegative().nullable(),
        }),
      )
      .nullable(),
    trade: trade.nullable(),
    acquisitionConditions: z.array(acquisition).nullable(),
    dishEffects: z
      .array(
        z.strictObject({
          effectId: positive,
          name: text,
          description: text,
          level: positive.nullable(),
          uses: positive.nullable(),
          durationSeconds: positive.nullable(),
        }),
      )
      .nullable(),
  });
}

export const CollectionDetailSchema = createCollectionDetailSchema(DeliveredImageSchema);

function createCropSeedDetailSchema(image: z.ZodType<string | null>) {
  const growth = createGrowthSchema(image);
  return z.strictObject({
    id: positive,
    description: text,
    quality: z.number().int().min(0).max(4).nullable(),
    trade: trade.nullable(),
    acquisitionConditions: z.array(acquisition).nullable(),
    stageIds: z.array(positive).nullable(),
    maturityDays: positive.nullable(),
    harvestCount: positive.nullable(),
    growth: growth.nullable(),
  });
}

export const CropSeedDetailSchema = createCropSeedDetailSchema(DeliveredImageSchema);

export function createCollectionObservationsSchema(
  image: z.ZodType<string | null> = DeliveredImageSchema,
) {
  const sourceSchema = createCatalogSchema(image);
  const collectionDetailSchema = createCollectionDetailSchema(image);
  const cropSeedDetailSchema = createCropSeedDetailSchema(image);
  return z
    .strictObject({
      schemaVersion: z.literal(1),
      source: CatalogSourceSchema,
      ingredientCategories: IngredientCategorySchema.array(),
      items: createObservedRecordSchema(image).array(),
      cropSeeds: z.array(
        z.strictObject({
          id: ItemIdSchema,
          name: z.string().min(1),
          image,
          productIds: ItemIdSchema.array().min(1),
          detail: cropSeedDetailSchema,
        }),
      ),
      details: collectionDetailSchema.array(),
    })
    .superRefine((catalog, ctx) => {
      const result = sourceSchema.safeParse(baseObservations(catalog));
      if (!result.success)
        for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: issue.path });
      validateObservedRelations(catalog, ctx);
      const itemIds = new Set(catalog.items.map((item) => item.id));
      const detailIds = new Set<number>();
      catalog.details.forEach((detail, index) => {
        if (!itemIds.has(detail.id) || detailIds.has(detail.id))
          ctx.addIssue({
            code: "custom",
            path: ["details", index, "id"],
            message: "Details must uniquely reference catalog items",
          });
        detailIds.add(detail.id);
        if (
          detail.creatureSize !== null &&
          detail.creatureSize.min !== null &&
          detail.creatureSize.max !== null &&
          detail.creatureSize.min > detail.creatureSize.max
        )
          ctx.addIssue({
            code: "custom",
            path: ["details", index, "creatureSize"],
            message: "Creature minimum size must not exceed maximum",
          });
      });
      if (detailIds.size !== itemIds.size)
        ctx.addIssue({
          code: "custom",
          path: ["details"],
          message: "Every catalog item requires a detail record",
        });
      const seedIds = new Set(catalog.cropSeeds.map((seed) => seed.id));
      if (
        catalog.cropSeeds.some((seed) => seed.detail.id !== seed.id) ||
        seedIds.size !== catalog.cropSeeds.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["cropSeeds"],
          message: "Seed detail IDs must match unique seed IDs",
        });
    });
}

export const CollectionObservationsSchema = createCollectionObservationsSchema();
export type CollectionObservations = z.infer<typeof CollectionObservationsSchema>;
export type CollectionDetail = z.infer<typeof CollectionDetailSchema>;
export type CropSeedDetail = z.infer<typeof CropSeedDetailSchema>;
export const parseCollectionObservations = (input: unknown): CollectionObservations =>
  CollectionObservationsSchema.parse(input);

export function emptyCollectionDetail(id: number): CollectionDetail {
  return {
    id,
    flowerColors: null,
    hybridRecipes: null,
    growth: null,
    treeDrops: null,
    creatureSize: null,
    creatureGrades: null,
    trade: null,
    acquisitionConditions: null,
    dishEffects: null,
  };
}

export function emptyCropSeedDetail(id: number): CropSeedDetail {
  return {
    id,
    description: null,
    quality: null,
    trade: null,
    acquisitionConditions: null,
    stageIds: null,
    maturityDays: null,
    harvestCount: null,
    growth: null,
  };
}

export function baseCollectionObservations(catalog: CollectionObservations): Catalog {
  return baseObservations(catalog);
}
