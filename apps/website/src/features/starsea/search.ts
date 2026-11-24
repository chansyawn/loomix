import { z } from "zod";
import { stripSearchParams } from "@tanstack/react-router";
import { listLayoutSchema } from "@/features/list-page/layout";

export const starseaSearchDefaults = { q: "", region: null } as const;

export const starseaSearchSchema = z.object({
  q: z.string().catch(starseaSearchDefaults.q).default(starseaSearchDefaults.q),
  region: z.number().int().positive().nullable().catch(null).default(null),
  layout: listLayoutSchema,
});

export type StarseaSearch = z.output<typeof starseaSearchSchema>;
export const starseaSearchMiddleware = stripSearchParams<StarseaSearch>(starseaSearchDefaults);

export function resolveStarseaSearch(
  regions: readonly { id: number }[],
  search: StarseaSearch,
): StarseaSearch {
  return regions.some((region) => region.id === search.region)
    ? search
    : { ...search, region: null };
}
