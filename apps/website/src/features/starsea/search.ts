import { z } from "zod";
import { collectionLayoutSchema } from "@/features/collection/layout";
import type { StarseaIslet } from "./view";

export const starseaSearchDefaults = { region: null, layout: "grid" } as const;

export const starseaSearchSchema = z.object({
  region: z.number().int().positive().nullable().catch(null).default(null),
  layout: collectionLayoutSchema.transform((value) => value ?? starseaSearchDefaults.layout),
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

export function filterIslets(islets: StarseaIslet[], region: StarseaSearch["region"]) {
  return region === null
    ? islets
    : islets.filter((islet) => islet.regions.some(({ id }) => id === region));
}
