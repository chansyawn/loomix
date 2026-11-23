import { z } from "zod";
import { listLayoutSchema } from "@/features/omnidex/layout";

export const starseaSearchDefaults = { q: "", region: null, layout: "grid" } as const;

export const starseaSearchSchema = z.object({
  q: z.string().catch(starseaSearchDefaults.q).default(starseaSearchDefaults.q),
  region: z.number().int().positive().nullable().catch(null).default(null),
  layout: listLayoutSchema.transform((value) => value ?? starseaSearchDefaults.layout),
});

export type StarseaSearch = z.output<typeof starseaSearchSchema>;

export function resolveStarseaSearch(
  regions: readonly { id: number }[],
  search: StarseaSearch,
): StarseaSearch {
  return regions.some((region) => region.id === search.region)
    ? search
    : { ...search, region: null };
}
