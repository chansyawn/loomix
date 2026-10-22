import type { SearchMiddleware } from "@tanstack/react-router";
import { z } from "zod";

export const missing = "__missing";
export const sortOptions = {
  original: "默认顺序",
  "name-asc": "名称：升序",
  "name-desc": "名称：降序",
  "quality-asc": "品阶：从低到高",
  "quality-desc": "品阶：从高到低",
};

const stringList = z
  .array(z.unknown())
  .catch([])
  .transform((values) => [
    ...new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ]);

const itemQuerySchema = z.object({
  q: z.string().catch("").default(""),
  sort: z
    .enum(Object.keys(sortOptions) as (keyof typeof sortOptions)[])
    .catch("original")
    .default("original"),
  qualities: stringList
    .transform((values) => values.filter((value) => value === missing || /^[0-4]$/.test(value)))
    .default([]),
});

export type MiscellanyQuery = z.output<typeof itemQuerySchema>;
export type MiscellanySearchInput = z.input<typeof miscellanySearchSchema>;
export type MiscellanySearch = z.output<typeof miscellanySearchSchema>;

export function emptyQuery(): MiscellanyQuery {
  return itemQuerySchema.parse({});
}

export const miscellanySearchSchema = z.object({
  items: itemQuerySchema.prefault({}).catch(emptyQuery),
});

function compactQuery(query: MiscellanyQuery): Partial<MiscellanyQuery> {
  const result: Partial<MiscellanyQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  if (query.qualities.length > 0) result.qualities = query.qualities;
  return result;
}

export function compactMiscellanySearch(input: MiscellanySearchInput): MiscellanySearchInput {
  const search = miscellanySearchSchema.parse(input);
  const items = compactQuery(search.items);
  return Object.keys(items).length > 0 ? { items } : {};
}

export const compactMiscellanySearchMiddleware: SearchMiddleware<MiscellanySearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  const { items: _items, ...other } = result;
  return { ...other, ...compactMiscellanySearch(result) } as MiscellanySearch;
};
