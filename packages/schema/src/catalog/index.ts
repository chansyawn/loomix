import { z } from "zod";
import { assertValid, IdSchema, NullableTextSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
import { CollectionSchema, ItemSchema } from "./items.ts";
import type { Collection, Item } from "./items.ts";
import { validateCatalog } from "./validate.ts";

export * from "./items.ts";
export * from "./recipes.ts";
export * from "./growth.ts";
export { createRecordTagResolver } from "./tags.ts";
export { validateCatalog } from "./validate.ts";

export const InspoBoxSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  acquisitionHint: NullableTextSchema,
  image: ImageRefSchema.extend({ variant: z.literal("illustration") }).nullable(),
});
export const CatalogSchema = z.strictObject({
  items: ItemSchema.array(),
  collections: CollectionSchema.array(),
  inspoBoxes: InspoBoxSchema.array(),
});
export type InspoBox = z.infer<typeof InspoBoxSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export function parseCatalog(input: unknown): Catalog {
  const catalog = CatalogSchema.parse(input);
  assertValid(validateCatalog(catalog));
  return catalog;
}

export interface CatalogIndex {
  items: ReadonlyMap<number, Item>;
  collections: ReadonlyMap<number, Collection>;
}
export function createCatalogIndex(catalog: Catalog): CatalogIndex {
  return {
    items: new Map(catalog.items.map((item) => [item.id, item])),
    collections: new Map(catalog.collections.map((collection) => [collection.id, collection])),
  };
}
