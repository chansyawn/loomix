import type { SearchMiddleware } from "@tanstack/react-router";
import { z } from "zod";
import { collectionLayoutSchema } from "../collection/layout";

export const missing = "__missing";
export const ungrouped = "__ungrouped";
export const sortOptions = {
  original: "默认顺序",
  "name-asc": "名称：升序",
  "name-desc": "名称：降序",
  "quality-asc": "品阶：从低到高",
  "quality-desc": "品阶：从高到低",
};
export const filterKeys = [
  "categories",
  "qualities",
  "sets",
  "colors",
  "materials",
  "styles",
  "sources",
] as const;
export type FilterKey = (typeof filterKeys)[number];
const stringList = z
  .array(z.unknown())
  .catch([])
  .transform((values) => [
    ...new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ]);
const base = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(["original", "name-asc", "name-desc", "quality-asc", "quality-desc"])
    .catch("original")
    .default("original"),
  qualities: stringList
    .transform((values) => values.filter((value) => value === missing || /^[0-4]$/.test(value)))
    .default([]),
});
const viewQuerySchema = base.extend({
  categories: stringList.default([]),
  sets: stringList.default([]),
  colors: stringList.default([]),
  materials: stringList.default([]),
  styles: stringList.default([]),
  sources: stringList.default([]),
});
export type ViewQuery = z.output<typeof viewQuerySchema>;
export function emptyQuery(): ViewQuery {
  return viewQuerySchema.parse({});
}
const setQuery = base.transform((query) => ({ ...emptyQuery(), ...query }));
const appearanceQuery = base
  .extend({ categories: stringList.default([]) })
  .transform((query) => ({ ...emptyQuery(), ...query }));
export const clothingSearchSchema = z.object({
  layout: collectionLayoutSchema,
  view: z.enum(["items", "sets", "appearances"]).catch("items").default("items"),
  items: viewQuerySchema.prefault({}).catch(emptyQuery),
  sets: setQuery.prefault({}).catch(emptyQuery),
  appearances: appearanceQuery.prefault({}).catch(emptyQuery),
});
export type ClothingSearchInput = z.input<typeof clothingSearchSchema>;
export type ClothingSearch = z.output<typeof clothingSearchSchema>;
export type View = ClothingSearch["view"];
export function updateViewQuery(search: ClothingSearch, patch: Partial<ViewQuery>): ClothingSearch {
  return { ...search, [search.view]: { ...search[search.view], ...patch } };
}
function compactQuery(query: ViewQuery): Partial<ViewQuery> {
  const result: Partial<ViewQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  for (const key of filterKeys) if (query[key].length) result[key] = query[key];
  return result;
}
export function compactClothingSearch(input: ClothingSearchInput): ClothingSearchInput {
  const search = clothingSearchSchema.parse(input);
  return {
    ...(search.layout ? { layout: search.layout } : {}),
    ...(search.view !== "items" ? { view: search.view } : {}),
    ...Object.fromEntries(
      (["items", "sets", "appearances"] as const).flatMap((view) => {
        const query = compactQuery(search[view]);
        return Object.keys(query).length ? [[view, query]] : [];
      }),
    ),
  };
}
export const compactClothingSearchMiddleware: SearchMiddleware<ClothingSearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  const {
    layout: _layout,
    view: _view,
    items: _items,
    sets: _sets,
    appearances: _appearances,
    ...other
  } = result;
  // Validation restores required defaults from the compact URL representation.
  return { ...other, ...compactClothingSearch(result) } as ClothingSearch;
};
