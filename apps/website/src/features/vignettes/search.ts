import { z } from "zod";
import { listLayoutSchema } from "@/features/omnidex/layout";
import { createNameMatcher } from "@/infrastructure/name-search";
import type { VignetteSummary } from "./view";

export const vignetteSearchDefaults = { q: "", site: null, layout: "grid" } as const;

export const vignetteSearchSchema = z.object({
  q: z.string().catch("").default(""),
  site: z.enum(["land", "water-edge", "beach"]).nullable().catch(null).default(null),
  layout: listLayoutSchema.transform((value) => value ?? vignetteSearchDefaults.layout),
});

export type VignetteSearch = z.output<typeof vignetteSearchSchema>;

export function filterVignettes(templates: VignetteSummary[], { q, site }: VignetteSearch) {
  const matchesName = createNameMatcher(q);
  return templates.filter(
    (entry) => (site === null || site === entry.site) && matchesName(entry.name),
  );
}
