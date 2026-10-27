import type { SearchMiddleware } from "@tanstack/react-router";
import { z } from "zod";
import { collectionLayoutSchema } from "../collection/layout";

export const categories = ["起居", "装饰物", "功能家具", "硬装", "绿植", "户外布设", "其他"];
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
  "types",
  "qualities",
  "sets",
  "colors",
  "materials",
  "sources",
] as const;
export type FilterKey = (typeof filterKeys)[number];

function strings(values: unknown[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ];
}

const stringList = z.array(z.unknown()).catch([]).transform(strings);
const viewQuerySchema = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(Object.keys(sortOptions) as (keyof typeof sortOptions)[])
    .catch("original")
    .default("original"),
  categories: stringList.default([]),
  types: stringList.default([]),
  qualities: stringList
    .transform((values) => values.filter((value) => value === missing || /^[0-4]$/.test(value)))
    .default([]),
  sets: stringList.default([]),
  colors: stringList.default([]),
  materials: stringList.default([]),
  sources: stringList.default([]),
});

export type ViewQuery = z.output<typeof viewQuerySchema>;
export type Sort = ViewQuery["sort"];

export function emptyQuery(): ViewQuery {
  return viewQuerySchema.parse({});
}

const itemQuerySchema = viewQuerySchema
  .extend({
    category: z.string().catch("").default(""),
    categories: z.array(z.unknown()).optional().catch(undefined),
  })
  .transform(({ category, categories: selected, ...query }): ViewQuery => ({
    ...query,
    categories: strings(selected ?? [category]).filter((value) => categories.includes(value)),
  }));

const setQuerySchema = viewQuerySchema
  .pick({ q: true, sort: true, qualities: true })
  .transform((query): ViewQuery => ({ ...emptyQuery(), ...query }));

export const furnitureSearchSchema = z.object({
  view: z.enum(["items", "sets"]).catch("items").default("items"),
  layout: collectionLayoutSchema,
  items: itemQuerySchema.prefault({}).catch(emptyQuery),
  sets: setQuerySchema.prefault({}).catch(emptyQuery),
});

export type FurnitureSearchInput = z.input<typeof furnitureSearchSchema>;
export type FurnitureSearch = z.output<typeof furnitureSearchSchema>;
export type View = FurnitureSearch["view"];

export function updateViewQuery(
  search: FurnitureSearch,
  patch: Partial<ViewQuery>,
): FurnitureSearch {
  return { ...search, [search.view]: { ...search[search.view], ...patch } };
}

function compactQuery(query: ViewQuery): Partial<ViewQuery> {
  const result: Partial<ViewQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  for (const key of filterKeys) {
    if (query[key].length > 0) result[key] = query[key];
  }
  return result;
}

export function compactFurnitureSearch(input: FurnitureSearchInput): FurnitureSearchInput {
  const search = furnitureSearchSchema.parse(input);
  const items = compactQuery(search.items);
  const sets = compactQuery(search.sets);
  return {
    ...(search.view === "sets" ? { view: search.view } : {}),
    ...(search.layout ? { layout: search.layout } : {}),
    ...(Object.keys(items).length > 0 ? { items } : {}),
    ...(Object.keys(sets).length > 0 ? { sets } : {}),
  };
}

export const compactFurnitureSearchMiddleware: SearchMiddleware<FurnitureSearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  const { view: _view, layout: _layout, items: _items, sets: _sets, ...other } = result;
  // Router middlewares return the wire representation; validation restores required defaults.
  return { ...other, ...compactFurnitureSearch(result) } as FurnitureSearch;
};
