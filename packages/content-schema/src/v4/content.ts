import { z } from "zod";
import { createCatalogSchema } from "../content.ts";
import {
  attributeSchemas,
  CatalogSourceSchema,
  DeliveredImageSchema,
  IngredientCategorySchema,
  ItemIdSchema,
  recordSchemas,
} from "../records.ts";
import type { Catalog } from "../content.ts";
import type { CatalogRecord, RecordType } from "../records.ts";
import { createV4RecordSchema } from "./records.ts";
import type { CatalogRecordV4 } from "./records.ts";

export function projectLegacyRecord(record: CatalogRecordV4): CatalogRecord {
  const type = `${record.category}.${record.kind}` as RecordType;
  const projected = Object.fromEntries(
    Object.keys(recordSchemas[type].shape).map((key) => [key, Reflect.get(record, key)]),
  );
  if (record.kind === "item")
    projected.attributes = Object.fromEntries(
      Object.keys(attributeSchemas[record.category].shape).map((key) => [
        key,
        Reflect.get(record.attributes, key),
      ]),
    );
  return projected as CatalogRecord;
}

export function projectLegacyCatalog(
  catalog: Pick<CatalogV4, "source" | "items" | "ingredientCategories">,
): Catalog {
  return {
    schemaVersion: 3,
    source: catalog.source,
    ingredientCategories: catalog.ingredientCategories,
    items: catalog.items.map(projectLegacyRecord),
  };
}

export function createCatalogV4Schema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  const legacy = createCatalogSchema(image);
  return z
    .strictObject({
      schemaVersion: z.literal(4),
      source: CatalogSourceSchema,
      ingredientCategories: IngredientCategorySchema.array(),
      items: createV4RecordSchema(image).array(),
      cropSeeds: z.array(
        z.strictObject({
          id: ItemIdSchema,
          name: z.string().min(1),
          image,
          productIds: ItemIdSchema.array().min(1),
        }),
      ),
    })
    .superRefine((catalog, ctx) => {
      const result = legacy.safeParse(projectLegacyCatalog(catalog));
      if (!result.success)
        for (const issue of result.error.issues)
          ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
      const records = new Map(catalog.items.map((record) => [record.id, record]));
      const seeds = new Map<number, (typeof catalog.cropSeeds)[number]>();
      const products = new Set<number>();
      for (const [index, seed] of catalog.cropSeeds.entries()) {
        if (seeds.has(seed.id) || records.has(seed.id))
          ctx.addIssue({
            code: "custom",
            path: ["cropSeeds", index, "id"],
            message: "Duplicate seed/catalog ID",
          });
        seeds.set(seed.id, seed);
        for (const [productIndex, id] of seed.productIds.entries()) {
          const record = records.get(id);
          if (
            products.has(id) ||
            !record ||
            record.category !== "plants" ||
            record.kind !== "item" ||
            record.seedId !== seed.id
          )
            ctx.addIssue({
              code: "custom",
              path: ["cropSeeds", index, "productIds", productIndex],
              message: "Invalid or duplicate crop product association",
            });
          products.add(id);
        }
        if (index > 0 && catalog.cropSeeds[index - 1]!.id >= seed.id)
          ctx.addIssue({
            code: "custom",
            path: ["cropSeeds", index],
            message: "Seeds must be sorted",
          });
        if (seed.productIds.some((id, i) => i > 0 && seed.productIds[i - 1]! >= id))
          ctx.addIssue({
            code: "custom",
            path: ["cropSeeds", index, "productIds"],
            message: "Products must be sorted and unique",
          });
      }
      for (const [index, record] of catalog.items.entries()) {
        if (record.kind !== "item") continue;
        if (
          record.category === "plants" &&
          record.seedId !== null &&
          (!seeds.has(record.seedId) || !products.has(record.id))
        )
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "seedId"],
            message: "Unresolved seed reference",
          });
        if (record.category === "creatures" && record.research) {
          if (
            new Set(record.research.tasks.map((task) => task.kind)).size !==
              record.research.tasks.length ||
            new Set(
              record.research.completionConditions.map((condition) => condition.requiredTaskCount),
            ).size !== record.research.completionConditions.length
          )
            ctx.addIssue({
              code: "custom",
              path: ["items", index, "research"],
              message: "Duplicate research task or condition",
            });
        }
        if (
          record.category === "dishes" &&
          record.attributes.tastes &&
          new Set(record.attributes.tastes).size !== record.attributes.tastes.length
        )
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "attributes", "tastes"],
            message: "Duplicate taste",
          });
        if (record.category !== "furniture" || record.craftingRecipes === null) continue;
        const recipeIds = new Set<number>();
        for (const [recipeIndex, recipe] of record.craftingRecipes.entries()) {
          const path = ["items", index, "craftingRecipes", recipeIndex];
          if (recipeIds.has(recipe.id))
            ctx.addIssue({ code: "custom", path, message: "Duplicate crafting recipe" });
          recipeIds.add(recipe.id);
          const materialIds = new Set<number>();
          for (const [materialIndex, material] of (recipe.materials ?? []).entries()) {
            const item = records.get(material.itemId);
            if (!item || item.kind !== "item" || materialIds.has(material.itemId))
              ctx.addIssue({
                code: "custom",
                path: [...path, "materials", materialIndex],
                message: "Invalid or duplicate crafting material",
              });
            materialIds.add(material.itemId);
          }
        }
      }
    });
}
export const CatalogV4Schema = createCatalogV4Schema();
export type CatalogV4 = z.infer<typeof CatalogV4Schema>;
export type CropSeed = CatalogV4["cropSeeds"][number];
export const parseCatalogV4 = (input: unknown): CatalogV4 => CatalogV4Schema.parse(input);
