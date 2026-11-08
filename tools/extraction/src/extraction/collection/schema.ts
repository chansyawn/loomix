import { z } from "zod";
import { createGrowthSchema, SeedSchema } from "@loomix/schema/catalog";
import {
  DropSchema as drop,
  TradeSchema as trade,
  AcquisitionSchema as acquisition,
} from "@loomix/schema/catalog";
import { createCatalogSchema } from "../content/schema/catalog.ts";
import { createObservedRecordSchema } from "../content/schema/features.ts";
import { baseObservations, validateObservedRelations } from "./relations.ts";
import { CatalogSourceSchema, IngredientCategorySchema } from "../content/schema/records.ts";
import { ItemIdSchema, DeliveredImageSchema } from "../content/schema/records.ts";
import type { Catalog } from "../content/schema/catalog.ts";

const text = z.string().min(1).nullable();
const positive = ItemIdSchema;
function createCollectionDetailSchema() {
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

export const CollectionDetailSchema = createCollectionDetailSchema();

export function createCollectionObservationsSchema(
  image: z.ZodType<string | null> = DeliveredImageSchema,
) {
  const sourceSchema = createCatalogSchema(image);
  const collectionDetailSchema = createCollectionDetailSchema();
  const seedSchema = SeedSchema.omit({ image: true }).extend({ image });
  const growthSchema = createGrowthSchema(image);
  return z
    .strictObject({
      schemaVersion: z.literal(1),
      source: CatalogSourceSchema,
      ingredientCategories: IngredientCategorySchema.array(),
      items: createObservedRecordSchema(image).array(),
      seeds: seedSchema.array(),
      growths: growthSchema.array(),
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
    });
}

export const CollectionObservationsSchema = createCollectionObservationsSchema();
export type CollectionObservations = z.infer<typeof CollectionObservationsSchema>;
export type CollectionDetail = z.infer<typeof CollectionDetailSchema>;
export const parseCollectionObservations = (input: unknown): CollectionObservations =>
  CollectionObservationsSchema.parse(input);

export function emptyCollectionDetail(id: number): CollectionDetail {
  return {
    id,
    flowerColors: null,
    hybridRecipes: null,
    treeDrops: null,
    creatureSize: null,
    creatureGrades: null,
    trade: null,
    acquisitionConditions: null,
    dishEffects: null,
  };
}

export function baseCollectionObservations(catalog: CollectionObservations): Catalog {
  return baseObservations(catalog);
}
