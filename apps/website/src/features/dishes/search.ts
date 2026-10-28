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
  "difficulties",
  "difficultyRequirements",
  "tastes",
  "galaxyFlavors",
  "cookwares",
  "effects",
  "qualities",
  "series",
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

const choices = (allowed: string[]) =>
  stringList.transform((values) =>
    values.filter((value) => value === missing || allowed.includes(value)),
  );

const viewQuerySchema = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(Object.keys(sortOptions) as (keyof typeof sortOptions)[])
    .catch("original")
    .default("original"),
  difficulties: stringList.default([]),
  difficultyRequirements: stringList.default([]),
  tastes: stringList.default([]),
  galaxyFlavors: stringList.default([]),
  cookwares: stringList.default([]),
  effects: stringList.default([]),
  qualities: choices(["0", "1", "2", "3", "4"]).default([]),
  series: stringList.default([]),
});

export type ViewQuery = z.output<typeof viewQuerySchema>;
export type Sort = ViewQuery["sort"];
export type View = "items" | "series";
export type DishesSearch = {
  view: View;
  layout?: "grid" | "table";
  items: ViewQuery;
  series: ViewQuery;
};
export type DishesSearchInput = z.input<typeof dishesSearchSchema>;

export function emptyQuery(): ViewQuery {
  return viewQuerySchema.parse({});
}

const seriesQuerySchema = viewQuerySchema
  .pick({ q: true, sort: true, qualities: true })
  .transform((query): ViewQuery => ({ ...emptyQuery(), ...query }));

export const dishesSearchSchema = z.object({
  layout: collectionLayoutSchema,
  view: z.enum(["items", "series"]).catch("items").default("items"),
  items: viewQuerySchema.prefault({}).catch(emptyQuery),
  series: seriesQuerySchema.prefault({}).catch(emptyQuery),
});

export function updateViewQuery(search: DishesSearch, patch: Partial<ViewQuery>): DishesSearch {
  return { ...search, [search.view]: { ...search[search.view], ...patch } };
}

function compactQuery(query: ViewQuery): Partial<ViewQuery> {
  const result: Partial<ViewQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  for (const key of filterKeys) if (query[key].length > 0) result[key] = query[key];
  return result;
}

export function compactDishesSearch(input: DishesSearchInput): DishesSearchInput {
  const search = dishesSearchSchema.parse(input);
  const items = compactQuery(search.items);
  const series = compactQuery(search.series);
  return {
    ...(search.layout ? { layout: search.layout } : {}),
    ...(search.view === "series" ? { view: search.view } : {}),
    ...(Object.keys(items).length > 0 ? { items } : {}),
    ...(Object.keys(series).length > 0 ? { series } : {}),
  };
}

export const compactDishesSearchMiddleware: SearchMiddleware<DishesSearch> = ({ search, next }) => {
  const result = next(search);
  const { layout: _layout, view: _view, items: _items, series: _series, ...other } = result;
  return { ...other, ...compactDishesSearch(result) } as DishesSearch;
};
