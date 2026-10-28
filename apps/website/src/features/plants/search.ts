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
  "galaxies",
  "series",
  "harvestCounts",
  "sources",
  "flowerColors",
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

const viewQuerySchema = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(Object.keys(sortOptions) as (keyof typeof sortOptions)[])
    .catch("original")
    .default("original"),
  categories: stringList.default([]),
  qualities: stringList
    .transform((values) => values.filter((value) => value === missing || /^[0-4]$/.test(value)))
    .default([]),
  galaxies: stringList.default([]),
  sources: stringList.default([]),
  flowerColors: stringList.default([]),
  series: stringList.default([]),
  harvestCounts: stringList
    .transform((values) =>
      values.filter((value) => value === missing || /^(0|[1-9]\d*)$/.test(value)),
    )
    .default([]),
});

export type ViewQuery = z.output<typeof viewQuerySchema>;
export type Sort = ViewQuery["sort"];
export type View = "items" | "series";
export type PlantsSearch = {
  view: View;
  layout?: "grid" | "table";
  items: ViewQuery;
  series: ViewQuery;
};
export type PlantsSearchInput = z.input<typeof plantsSearchSchema>;

export function emptyQuery(): ViewQuery {
  return viewQuerySchema.parse({});
}

const seriesQuerySchema = viewQuerySchema
  .pick({ q: true, sort: true, qualities: true, sources: true, flowerColors: true })
  .transform((query): ViewQuery => ({ ...emptyQuery(), ...query }));

export const plantsSearchSchema = z.object({
  layout: collectionLayoutSchema,
  view: z.enum(["items", "series"]).catch("items").default("items"),
  items: viewQuerySchema.prefault({}).catch(emptyQuery),
  series: seriesQuerySchema.prefault({}).catch(emptyQuery),
});

export function updateViewQuery(search: PlantsSearch, patch: Partial<ViewQuery>): PlantsSearch {
  return { ...search, [search.view]: { ...search[search.view], ...patch } };
}

function compactQuery(query: ViewQuery): Partial<ViewQuery> {
  const result: Partial<ViewQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  for (const key of filterKeys) if (query[key].length > 0) result[key] = query[key];
  return result;
}

export function compactPlantsSearch(input: PlantsSearchInput): PlantsSearchInput {
  const search = plantsSearchSchema.parse(input);
  const items = compactQuery(search.items);
  const series = compactQuery(search.series);
  return {
    ...(search.layout ? { layout: search.layout } : {}),
    ...(search.view === "series" ? { view: search.view } : {}),
    ...(Object.keys(items).length > 0 ? { items } : {}),
    ...(Object.keys(series).length > 0 ? { series } : {}),
  };
}

export const compactPlantsSearchMiddleware: SearchMiddleware<PlantsSearch> = ({ search, next }) => {
  const result = next(search);
  const { layout: _layout, view: _view, items: _items, series: _series, ...other } = result;
  return { ...other, ...compactPlantsSearch(result) } as PlantsSearch;
};
