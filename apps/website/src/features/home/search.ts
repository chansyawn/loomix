import { catalogSearchSchema, type CatalogSearch } from "../catalog/search";

export function createHomeSearch(keyword: string): CatalogSearch | null {
  const q = keyword.trim();
  return q ? catalogSearchSchema.parse({ items: { q } }) : null;
}
