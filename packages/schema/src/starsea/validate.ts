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
  unique(starsea.islands, (island) => island.id, ["islands"]);
  unique(starsea.iconStyles, (style) => style.id, ["iconStyles"]);
  const islands = new Set(starsea.islands.map((island) => island.id));
  const styles = new Set(starsea.iconStyles.map((style) => style.id));
  const linkedIslands = new Set<number>();
  const checkIslands = (ids: number[], path: (string | number)[]) => {
    unique(ids, (id) => id, path);
    ids.forEach((id, index) => {
      if (!islands.has(id)) issue([...path, index], `Unknown island ${id}`);
      linkedIslands.add(id);
    });
  };
  starsea.regions.forEach((region, index) => {
    const path = ["regions", index];
    checkIslands(region.explorationIslandIds, [...path, "explorationIslandIds"]);
    unique(region.encounters, (entry) => entry.neighborId, [...path, "encounters"]);
    region.encounters.forEach((entry, encounterIndex) => {
      const encounterPath = [...path, "encounters", encounterIndex];
      if (!neighbors.has(entry.neighborId))
        issue([...encounterPath, "neighborId"], `Unknown neighbor ${entry.neighborId}`);
      if (entry.candidateIslandIds)
        checkIslands(entry.candidateIslandIds, [...encounterPath, "candidateIslandIds"]);
    });
  });
  starsea.islands.forEach((island, index) => {
    const path = ["islands", index];
    if (!linkedIslands.has(island.id)) issue(path, `Unlinked island ${island.id}`);
    if (!styles.has(island.iconStyleId))
      issue([...path, "iconStyleId"], `Unknown icon style ${island.iconStyleId}`);
    for (const field of ["displayedCreatureIds", "displayedSpecialtyIds"] as const) {
      const ids = island[field] ?? [];
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
