import type { Item } from "../catalog/index.ts";
import { createIssueCollector } from "../common/identity.ts";
import { vignetteObjectIds, vignetteTargets, type Vignettes } from "./index.ts";

export function validateVignettes(
  { templates, fallbackItems }: Vignettes,
  items: ReadonlyMap<number, Item>,
  tags: ReadonlySet<number>,
  neighbors: ReadonlySet<number>,
) {
  const { issues, issue, unique } = createIssueCollector("invalid_reference", ["vignettes"]);
  unique(templates, ({ id }) => id, ["templates"]);
  unique(fallbackItems, ({ id }) => id, ["fallbackItems"]);
  const fallback = new Set(fallbackItems.map(({ id }) => id));
  const requiredFallback = new Set<number>();

  templates.forEach((template, index) => {
    const path = ["templates", index];
    for (const id of vignetteObjectIds(template)) {
      if (items.has(id)) continue;
      requiredFallback.add(id);
      if (!fallback.has(id)) issue(path, `Unknown vignette item ${id}`);
    }
    for (const target of vignetteTargets(template))
      if ("allTagIds" in target)
        for (const id of target.allTagIds)
          if (!tags.has(id)) issue(path, `Unknown vignette tag ${id}`);
    for (const id of template.creatureItemIds)
      if (items.get(id)?.kind !== "creature")
        issue([...path, "creatureItemIds"], `Invalid vignette creature ${id}`);
    for (const id of template.neighborIds)
      if (!neighbors.has(id)) issue([...path, "neighborIds"], `Unknown vignette neighbor ${id}`);
  });
  fallbackItems.forEach(({ id }, index) => {
    if (!requiredFallback.has(id))
      issue(["fallbackItems", index], `Unneeded vignette fallback ${id}`);
  });
  return issues;
}
