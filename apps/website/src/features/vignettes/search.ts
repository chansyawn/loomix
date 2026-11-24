import { z } from "zod";
import { stripSearchParams } from "@tanstack/react-router";
import { listLayoutSchema } from "@/features/list-page/layout";
import { createNameMatcher } from "@/infrastructure/name-search";
import type { VignetteSummary } from "./view";

export const vignetteSearchDefaults = { q: "", site: null } as const;

export const vignetteSearchSchema = z.object({
  q: z.string().catch("").default(""),
  site: z.enum(["land", "water-edge", "beach"]).nullable().catch(null).default(null),
  layout: listLayoutSchema,
});

export type VignetteSearch = z.output<typeof vignetteSearchSchema>;
export const vignetteSearchMiddleware = stripSearchParams<VignetteSearch>(vignetteSearchDefaults);

export function filterVignettes(
  templates: VignetteSummary[],
  { q, site }: Pick<VignetteSearch, "q" | "site">,
) {
  const matchesName = createNameMatcher(q);
  return templates.filter(
    (entry) => (site === null || site === entry.site) && matchesName(entry.name),
  );
}
