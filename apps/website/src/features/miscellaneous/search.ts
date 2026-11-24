import type { SearchMiddleware } from "@tanstack/react-router";
import { z } from "zod";
import { listLayoutSchema } from "../list-page/layout";

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

export type MiscellaneousQuery = z.output<typeof itemQuerySchema>;
export type MiscellaneousSearchInput = z.input<typeof miscellaneousSearchSchema>;
export type MiscellaneousSearch = z.output<typeof miscellaneousSearchSchema>;

export function emptyQuery(): MiscellaneousQuery {
  return itemQuerySchema.parse({});
}

export const miscellaneousSearchSchema = z.object({
  layout: listLayoutSchema,
  items: itemQuerySchema.prefault({}).catch(emptyQuery),
});

function compactQuery(query: MiscellaneousQuery): Partial<MiscellaneousQuery> {
  const result: Partial<MiscellaneousQuery> = {};
  if (query.q !== "") result.q = query.q;
  if (query.sort !== "original") result.sort = query.sort;
  if (query.qualities.length > 0) result.qualities = query.qualities;
  return result;
}

export function compactMiscellaneousSearch(
  input: MiscellaneousSearchInput,
): MiscellaneousSearchInput {
  const search = miscellaneousSearchSchema.parse(input);
  const items = compactQuery(search.items);
  return {
    ...(search.layout ? { layout: search.layout } : {}),
    ...(Object.keys(items).length > 0 ? { items } : {}),
  };
}

export const compactMiscellaneousSearchMiddleware: SearchMiddleware<MiscellaneousSearch> = ({
  search,
  next,
}) => {
  const result = next(search);
  const { layout: _layout, items: _items, ...other } = result;
  return { ...other, ...compactMiscellaneousSearch(result) } as MiscellaneousSearch;
};
