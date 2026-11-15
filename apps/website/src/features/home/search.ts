import { allSearchSchema, type AllSearch } from "../all/search";

export function createHomeSearch(keyword: string): AllSearch | null {
  const q = keyword.trim();
  return q ? allSearchSchema.parse({ items: { q } }) : null;
}
