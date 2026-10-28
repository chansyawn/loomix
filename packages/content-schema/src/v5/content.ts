import { z } from "zod";
import { createCatalogV4Schema } from "../v4/content.ts";
import { projectLegacyCatalog } from "../v4/content.ts";
import { ItemIdSchema, DeliveredImageSchema } from "../records.ts";
import type { CatalogV4 } from "../v4/content.ts";
import type { Catalog } from "../content.ts";

const text = z.string().min(1).nullable();
const positive = ItemIdSchema;
const drop = z.strictObject({
  itemId: positive,
  dropGroupId: positive.nullable(),
  weight: z.number().nonnegative().nullable(),
  quantityMin: positive.nullable(),
  quantityMax: positive.nullable(),
  probability: z.number().min(0).max(1).nullable(),
});
const trade = z.strictObject({
  sellPrice: z.number().nonnegative().nullable(),
  offers: z
    .array(
      z.strictObject({
        id: positive,
        goodsGroupId: positive,
        buyPrice: z.number().nonnegative().nullable(),
        currencyItemId: positive.nullable(),
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
const acquisition = z.strictObject({
  sourceId: positive,
  label: z.string().min(1),
  condition: text,
});
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

export function createCatalogV5Schema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const legacySchema = createCatalogV4Schema(image);
  const collectionDetailSchema = createCollectionDetailSchema(image);
  const cropSeedDetailSchema = createCropSeedDetailSchema(image);
  return z
    .strictObject({
      ...legacySchema.shape,
      schemaVersion: z.literal(5),
      items: legacySchema.shape.items,
      cropSeeds: z.array(
        z.strictObject({
          ...legacySchema.shape.cropSeeds.element.shape,
          detail: cropSeedDetailSchema,
        }),
      ),
      details: collectionDetailSchema.array(),
    })
    .superRefine((catalog, ctx) => {
      const { details: _details, ...catalogBase } = catalog;
      const base: CatalogV4 = {
        ...catalogBase,
        schemaVersion: 4,
        cropSeeds: catalog.cropSeeds.map(({ detail: _detail, ...seed }) => seed),
      };
      const result = legacySchema.safeParse(base);
      if (!result.success)
        for (const issue of result.error.issues) ctx.addIssue({ ...issue, path: issue.path });
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

export const CatalogV5Schema = createCatalogV5Schema();
export type CatalogV5 = z.infer<typeof CatalogV5Schema>;
export type CollectionDetail = z.infer<typeof CollectionDetailSchema>;
export type CropSeedDetail = z.infer<typeof CropSeedDetailSchema>;
export const parseCatalogV5 = (input: unknown): CatalogV5 => CatalogV5Schema.parse(input);

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

export function projectLegacyCatalogV5(
  catalog: CatalogV5,
  image: z.ZodType<string | null> = DeliveredImageSchema,
): Catalog {
  const legacy: CatalogV4 = createCatalogV4Schema(image).parse({
    schemaVersion: 4,
    source: catalog.source,
    ingredientCategories: catalog.ingredientCategories,
    items: catalog.items,
    cropSeeds: catalog.cropSeeds.map(({ detail: _detail, ...seed }) => seed),
  });
  return projectLegacyCatalog(legacy);
}
