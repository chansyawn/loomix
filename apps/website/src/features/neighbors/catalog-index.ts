import type { Catalog, CatalogRecord } from "@loomix/schema/catalog";

export interface CatalogIndex {
  records: ReadonlyMap<number, CatalogRecord>;
  names: ReadonlyMap<number, string>;
}

export function createCatalogIndex(catalog: Catalog): CatalogIndex {
  const records = new Map(catalog.records.map((record) => [record.id, record]));
  const names = new Map<number, string>();
  for (const reference of catalog.references) names.set(reference.id, reference.name);
  for (const record of catalog.records) names.set(record.id, record.name);
  return { records, names };
}
