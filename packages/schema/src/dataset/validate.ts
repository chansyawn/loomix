import { createGameplayTagIndex, validateGameplayTags } from "../gameplay-tags/index.ts";
import type { Dataset } from "./index.ts";
import { resolveItem } from "../catalog/records.ts";
import { validateCatalog } from "../catalog/validate.ts";
import type { ValidationIssue } from "../common/identity.ts";

export function validateDataset(dataset: Dataset): ValidationIssue[] {
  const treeIssues = validateGameplayTags(dataset.gameplayTags.tags);
  const issues = [...validateCatalog(dataset.catalog), ...treeIssues];
  const issue = (path: (string | number)[], message: string) =>
    issues.push({ code: "invalid_reference", path, message });
  for (const domain of ["gameplayTags", "catalog", "neighbors", "world"] as const)
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
    "giftPreferences",
    "additionalImages",
  ] as const)
    unique<{ key: string }>(neighbors[name], (value) => value.key, ["neighbors", name]);
  unique(neighbors.outfits, (outfit) => outfit.id, ["neighbors", "outfits"]);
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
  const items = new Map(catalog.records.map((item) => [item.id, item]));
  const tags = new Set(dataset.gameplayTags.tags.map((tag) => tag.id));
  catalog.records.forEach((record, index) => {
    for (const id of record.tagIds)
      if (!tags.has(id)) issue(["catalog", "records", index, "tagIds"], `Unknown tag ${id}`);
  });
  const tagIndex = treeIssues.length ? null : createGameplayTagIndex(dataset.gameplayTags.tags);
  const root = tagIndex?.findByName("食材");
  const ingredientIds = new Set(root ? tagIndex!.subtree(root.id).map((tag) => tag.id) : []);
  catalog.ingredientCategories.forEach((category, index) => {
    if (!ingredientIds.has(category.tagId))
      issue(
        ["catalog", "ingredientCategories", index, "tagId"],
        `Invalid ingredient tag ${category.tagId}`,
      );
  });
  neighbors.giftPreferences.forEach((preference, index) => {
    const path = ["neighbors", "giftPreferences", index];
    if (!ids.has(preference.neighborId))
      issue([...path, "neighborId"], `Unknown neighbor ${preference.neighborId}`);
    if (preference.key !== `${preference.neighborId}:${preference.level}`)
      issue([...path, "key"], "Invalid preference key");
    unique(preference.itemIds, (id) => id, [...path, "itemIds"]);
    unique(preference.tagIds, (id) => id, [...path, "tagIds"]);
    for (const id of preference.itemIds)
      if (!resolveItem(catalog, id)) issue([...path, "itemIds"], `Unknown item ${id}`);
    for (const id of preference.tagIds) {
      if (!tags.has(id)) issue([...path, "tagIds"], `Unknown preference tag ${id}`);
    }
  });
  neighbors.outfits.forEach((outfit, index) => {
    if (outfit.neighborId !== null && !ids.has(outfit.neighborId))
      issue(["neighbors", "outfits", index, "neighborId"], `Unknown neighbor ${outfit.neighborId}`);
    unique(outfit.offers, (offer) => offer.id, ["neighbors", "outfits", index, "offers"]);
  });
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
