import type { Dataset } from "./index.ts";
import { validateCatalog } from "../catalog/validate.ts";
import type { ValidationIssue } from "../common/identity.ts";

export function validateDataset(dataset: Dataset): ValidationIssue[] {
  const issues = validateCatalog(dataset.catalog);
  const issue = (path: (string | number)[], message: string) =>
    issues.push({ code: "invalid_reference", path, message });
  for (const domain of ["catalog", "neighbors", "world"] as const)
    for (const field of ["snapshotId", "locale", "formatVersion"] as const)
      if (dataset[domain][field] !== dataset.context[field])
        issue([domain, field], "Dataset context mismatch");
  const unique = <T>(
    values: readonly T[],
    key: (value: T) => string | number,
    path: (string | number)[],
  ) => {
    const seen = new Set<string | number>();
    values.forEach((value, index) => {
      const id = key(value);
      if (seen.has(id)) issue([...path, index], `Duplicate identity ${id}`);
      seen.add(id);
    });
  };
  const { neighbors, world, catalog } = dataset;
  const ids = new Set(neighbors.neighbors.map((neighbor) => neighbor.id));
  const checkNeighbors = (values: number[], path: (string | number)[]) => {
    unique(values, (id) => id, path);
    for (const id of values) if (!ids.has(id)) issue(path, `Unknown neighbor ${id}`);
  };
  unique(neighbors.neighbors, (neighbor) => neighbor.id, ["neighbors", "neighbors"]);
  for (const name of [
    "stars",
    "stories",
    "travelReactions",
    "friendshipRules",
    "eventTags",
    "furnishingThemes",
    "additionalImages",
  ] as const)
    unique<{ key: string }>(neighbors[name], (value) => value.key, ["neighbors", name]);
  for (const name of ["stars", "stories", "travelReactions", "additionalImages"] as const)
    neighbors[name].forEach((value, index) => {
      if (value.neighborId !== null)
        checkNeighbors([value.neighborId], ["neighbors", name, index, "neighborId"]);
    });
  neighbors.stories.forEach((story, index) => {
    unique(story.paragraphs, (paragraph) => paragraph.sequence, [
      "neighbors",
      "stories",
      index,
      "paragraphs",
    ]);
    if (!story.paragraphs.length || story.key !== `${story.neighborId}:${story.chapter}`)
      issue(["neighbors", "stories", index], "Invalid story identity or empty chapter");
  });
  neighbors.travelReactions.forEach((reaction, index) => {
    if (reaction.key !== `${reaction.neighborId ?? "fallback"}:${reaction.variantId}`)
      issue(["neighbors", "travelReactions", index], "Invalid reaction key");
  });
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  unique(neighbors.rewards, (reward) => reward.itemId, ["neighbors", "rewards"]);
  for (const reward of neighbors.rewards)
    if (!items.has(reward.itemId))
      issue(["neighbors", "rewards"], `Unknown reward ${reward.itemId}`);
  for (const name of ["furnishingThemes", "rewards"] as const)
    for (const value of neighbors[name])
      checkNeighbors("neighborIds" in value ? value.neighborIds : value.relatedNeighborIds, [
        "neighbors",
        name,
      ]);
  unique(neighbors.resources, (resource) => resource.path, ["neighbors", "resources"]);
  for (const resource of neighbors.resources)
    checkNeighbors(resource.relatedNeighborIds, ["neighbors", "resources"]);
  for (const name of ["islands", "islandIconStyles", "regions"] as const)
    unique<{ id: number }>(world[name], (value) => value.id, ["world", name]);
  const styles = new Set(world.islandIconStyles.map((style) => style.id));
  const regions = new Map(world.regions.map((region) => [region.id, region]));
  world.islands.forEach((island, index) => {
    const path = ["world", "islands", index];
    if (!styles.has(island.iconStyleId))
      issue([...path, "iconStyleId"], "Unknown island icon style");
    if (island.regionId !== null) {
      const region = regions.get(island.regionId);
      if (!region || (island.galaxyId !== null && region.galaxyId !== island.galaxyId))
        issue([...path, "regionId"], "Unknown or inconsistent island region");
    }
    checkNeighbors(island.neighborIds, [...path, "neighborIds"]);
    for (const field of ["displayCreatureIds", "displaySpecialtyIds"] as const) {
      unique(island[field], (id) => id, [...path, field]);
      for (const id of island[field]) {
        const item = items.get(id);
        if (!item || (field === "displayCreatureIds" && item.type !== "creature"))
          issue([...path, field], `Unknown island item ${id}`);
      }
    }
  });
  return issues;
}
