import { z } from "zod";
import { validatePlantings } from "@loomix/schema/catalog";
import { attributeSchemas, recordSchemas } from "../content/schema/records.ts";
import type { CatalogRecord, RecordType } from "../content/schema/records.ts";
import type { Catalog } from "../content/schema/catalog.ts";
import type { CatalogRecordObserved } from "../content/schema/features.ts";
export function baseRecord(record: CatalogRecordObserved): CatalogRecord {
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

export function baseObservations(catalog: {
  source: Catalog["source"];
  items: CatalogRecordObserved[];
  ingredientCategories: Catalog["ingredientCategories"];
}): Catalog {
  return {
    schemaVersion: 1,
    source: catalog.source,
    ingredientCategories: catalog.ingredientCategories,
    items: catalog.items.map(baseRecord),
  };
}

export function validateObservedRelations(
  catalog: {
    items: CatalogRecordObserved[];
    seeds: { id: number; growthId: number }[];
    growths: Parameters<typeof validatePlantings>[1];
  },
  ctx: z.RefinementCtx,
): void {
  const plants = new Set(
    catalog.items
      .filter((record) => record.category === "plants" && record.kind === "item")
      .map((record) => record.id),
  );
  for (const issue of validatePlantings(catalog.seeds, catalog.growths, plants))
    ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
}
