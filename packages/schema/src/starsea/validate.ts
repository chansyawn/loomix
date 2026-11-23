import type { Item } from "../catalog/index.ts";
import { createIssueCollector } from "../common/identity.ts";
import type { Starsea } from "./index.ts";

export function validateStarsea(
  starsea: Starsea,
  items: ReadonlyMap<number, Item>,
  neighbors: ReadonlySet<number>,
) {
  const { issues, issue, unique } = createIssueCollector("invalid_reference", ["starsea"]);
  unique(starsea.regions, (region) => region.id, ["regions"]);
  unique(starsea.islets, (islet) => islet.id, ["islets"]);
  unique(starsea.iconStyles, (style) => style.id, ["iconStyles"]);
  const islets = new Set(starsea.islets.map((islet) => islet.id));
  const styles = new Set(starsea.iconStyles.map((style) => style.id));
  const linkedIslets = new Set<number>();
  const checkIslets = (ids: number[], path: (string | number)[]) => {
    unique(ids, (id) => id, path);
    ids.forEach((id, index) => {
      if (!islets.has(id)) issue([...path, index], `Unknown islet ${id}`);
      linkedIslets.add(id);
    });
  };
  starsea.regions.forEach((region, index) => {
    const path = ["regions", index];
    checkIslets(region.explorationIsletIds, [...path, "explorationIsletIds"]);
    unique(region.encounters, (entry) => entry.neighborId, [...path, "encounters"]);
    region.encounters.forEach((entry, encounterIndex) => {
      const encounterPath = [...path, "encounters", encounterIndex];
      if (!neighbors.has(entry.neighborId))
        issue([...encounterPath, "neighborId"], `Unknown neighbor ${entry.neighborId}`);
      if (entry.candidateIsletIds)
        checkIslets(entry.candidateIsletIds, [...encounterPath, "candidateIsletIds"]);
    });
  });
  starsea.islets.forEach((islet, index) => {
    const path = ["islets", index];
    if (!linkedIslets.has(islet.id)) issue(path, `Unlinked islet ${islet.id}`);
    if (!styles.has(islet.iconStyleId))
      issue([...path, "iconStyleId"], `Unknown icon style ${islet.iconStyleId}`);
    for (const field of ["displayedCreatureIds", "displayedSpecialtyIds"] as const) {
      const ids = islet[field] ?? [];
      unique(ids, (id) => id, [...path, field]);
      ids.forEach((id, itemIndex) => {
        const item = items.get(id);
        if (!item) issue([...path, field, itemIndex], `Unknown item ${id}`);
        else if (field === "displayedCreatureIds" && !["creature", "reference"].includes(item.kind))
          issue([...path, field, itemIndex], `Expected creature or reference item ${id}`);
      });
    }
  });
  return issues;
}
