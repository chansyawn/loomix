import type { SearchMiddleware } from "@tanstack/react-router";
import { z } from "zod";

export const missing = "__missing";
export const ungrouped = "__ungrouped";
export const categories = ["水生生物", "陆地生物", "海岸生物"];
export const seasons = ["春季", "夏季", "秋季", "冬季", "全年"];
export const times = ["白天", "夜晚", "全天"];
export const weather = ["晴天", "雨天", "雪天", "任意天气"];
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
  "regions",
  "habitats",
  "seasons",
  "times",
  "weather",
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
  categories: choices(categories).default([]),
  qualities: choices(["0", "1", "2", "3", "4"]).default([]),
  regions: stringList.default([]),
  habitats: stringList.default([]),
  seasons: choices(seasons).default([]),
  times: choices(times).default([]),
  weather: choices(weather).default([]),
  series: stringList.default([]),
});
export type ViewQuery = z.output<typeof viewQuerySchema>;
export type Sort = ViewQuery["sort"];
export function emptyQuery(): ViewQuery {
  return viewQuerySchema.parse({});
}
const seriesQuerySchema = viewQuerySchema
  .pick({ q: true, sort: true, qualities: true })
  .transform((query): ViewQuery => ({ ...emptyQuery(), ...query }));
export const creaturesSearchSchema = z.object({
  view: z.enum(["items", "series"]).catch("items").default("items"),
  items: viewQuerySchema.prefault({}).catch(emptyQuery),
  series: seriesQuerySchema.prefault({}).catch(emptyQuery),
});
export type CreaturesSearchInput = z.input<typeof creaturesSearchSchema>;
export type CreaturesSearch = z.output<typeof creaturesSearchSchema>;
export type View = CreaturesSearch["view"];
export function updateViewQuery(
  search: CreaturesSearch,
  patch: Partial<ViewQuery>,
): CreaturesSearch {
  return { ...search, [search.view]: { ...search[search.view], ...patch } };
}
function compactQuery(query: ViewQuery): Partial<ViewQuery> {
  const result: Partial<ViewQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  for (const key of filterKeys) if (query[key].length > 0) result[key] = query[key];
  return result;
}
export function compactCreaturesSearch(input: CreaturesSearchInput): CreaturesSearchInput {
  const search = creaturesSearchSchema.parse(input);
  const items = compactQuery(search.items);
  const series = compactQuery(search.series);
  return {
    ...(search.view === "series" ? { view: search.view } : {}),
    ...(Object.keys(items).length > 0 ? { items } : {}),
    ...(Object.keys(series).length > 0 ? { series } : {}),
  };
}
export const compactCreaturesSearchMiddleware: SearchMiddleware<CreaturesSearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  const { view: _view, items: _items, series: _series, ...other } = result;
  // Validation restores defaults omitted from the URL representation.
  return { ...other, ...compactCreaturesSearch(result) } as CreaturesSearch;
};
