import { z } from "zod";
import type { SearchMiddleware } from "@tanstack/react-router";
import { listLayoutSchema } from "../omnidex/layout";
export { sortOptions } from "../furniture/search";
export const filterKeys = ["tags", "categories", "qualities", "acquisition"] as const;
export type FilterKey = (typeof filterKeys)[number];
const list = z
  .array(z.string())
  .catch([])
  .transform((values) => [...new Set(values)])
  .default([]);
const querySchema = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(["original", "name-asc", "name-desc", "quality-asc", "quality-desc"])
    .catch("original")
    .default("original"),
  categories: list,
  qualities: list,
  tags: z
    .array(z.string())
    .catch([])
    .transform((values) =>
      [...new Set(values)].filter(
        (value) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)),
      ),
    )
    .default([]),
  tagMode: z.enum(["and", "or"]).catch("and").default("and"),
  acquisition: list,
});
export const emptyQuery = () => querySchema.parse({});
export const catalogSearchSchema = z.object({
  layout: listLayoutSchema,
  items: querySchema.prefault({}).catch(emptyQuery),
});
export type CatalogSearch = z.output<typeof catalogSearchSchema>;
export type CatalogQuery = CatalogSearch["items"];
export function catalogSearchForTag(id: number): CatalogSearch {
  return catalogSearchSchema.parse({ items: { tags: [String(id)] } });
}
export function compactCatalogSearch(input: z.input<typeof catalogSearchSchema>) {
  const search = catalogSearchSchema.parse(input),
    query: Partial<CatalogQuery> = {};
  if (search.items.q) query.q = search.items.q;
  if (search.items.sort !== "original") query.sort = search.items.sort;
  if (search.items.tagMode !== "and") query.tagMode = search.items.tagMode;
  for (const key of filterKeys) if (search.items[key].length) query[key] = search.items[key];
  return {
    ...(search.layout ? { layout: search.layout } : {}),
    ...(Object.keys(query).length ? { items: query } : {}),
  };
}
export const compactCatalogSearchMiddleware: SearchMiddleware<CatalogSearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  const { items: _items, layout: _layout, ...other } = result;
  return { ...other, ...compactCatalogSearch(result) } as CatalogSearch;
};
