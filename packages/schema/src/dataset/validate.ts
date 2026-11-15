import { createGameplayTagIndex, validateGameplayTags } from "../gameplay-tags/index.ts";
import type { Dataset } from "./index.ts";
import { resolveItem } from "../catalog/records.ts";
import type { IngredientExpression } from "../catalog/recipes.ts";
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
  for (const [index, type] of catalog.clientTypes.entries())
    for (const id of type.tagIds)
      if (!tags.has(id)) issue(["catalog", "clientTypes", index, "tagIds"], `Unknown tag ${id}`);
  catalog.records.forEach((record, index) => {
    for (const [field, ids] of Object.entries(record.tagFields))
      for (const id of ids)
        if (!tags.has(id))
          issue(["catalog", "records", index, "tagFields", field], `Unknown tag ${id}`);
    for (const id of record.tagIds)
      if (!tags.has(id)) issue(["catalog", "records", index, "tagIds"], `Unknown tag ${id}`);
  });
  const tagIndex = treeIssues.length ? null : createGameplayTagIndex(dataset.gameplayTags.tags);
  const root = tagIndex?.findByName("食材");
  const ingredientIds = new Set(root ? tagIndex!.subtree(root.id).map((tag) => tag.id) : []);
  {
    const checkExpression = (expression: IngredientExpression, path: (string | number)[]): void => {
      if (expression.kind === "tag") {
        if (!ingredientIds.has(expression.tagId))
          issue(path, `Unknown ingredient tag ${expression.tagId}`);
        return;
      }
      expression.terms.forEach((term, index) => checkExpression(term, [...path, "terms", index]));
    };
    catalog.cookingRecipes.forEach((record, index) => {
      record.slots?.forEach((slot, slotIndex) => {
        if (slot.expression === null) return;
        checkExpression(slot.expression, [
          "catalog",
          "cookingRecipes",
          index,
          "slots",
          slotIndex,
          "expression",
        ]);
      });
    });
  }
  const cookingIds = new Set(catalog.cookingRecipes.map((recipe) => recipe.id));
  const collectionIds = new Set(catalog.craftingCollections.map((collection) => collection.id));
  neighbors.neighbors.forEach((neighbor, index) => {
    const path = ["neighbors", "neighbors", index];
    const checkItem = (id: number | null, field: (string | number)[]) => {
      if (id !== null && !resolveItem(catalog, id))
        issue([...path, ...field], `Unknown item ${id}`);
    };
    if (
      neighbor.signature.cookingRecipeId !== null &&
      !cookingIds.has(neighbor.signature.cookingRecipeId)
    )
      issue([...path, "signature", "cookingRecipeId"], "Unknown signature recipe");
    checkItem(neighbor.signature.friendshipOutfitItemId, ["signature", "friendshipOutfitItemId"]);
    if (
      neighbor.design.furnitureSetId !== null &&
      items.get(neighbor.design.furnitureSetId)?.kind !== "furniture.set"
    )
      issue([...path, "design", "furnitureSetId"], "Unknown furniture set");
    if (
      neighbor.design.craftingCollectionId !== null &&
      !collectionIds.has(neighbor.design.craftingCollectionId)
    )
      issue([...path, "design", "craftingCollectionId"], "Unknown crafting collection");
    unique(neighbor.abilities, (ability) => ability.key, [...path, "abilities"]);
    unique(neighbor.abilityDescriptions, (ability) => ability.key, [
      ...path,
      "abilityDescriptions",
    ]);
    if (neighbor.house) {
      checkItem(neighbor.house.buildingPackageItemId, ["house", "buildingPackageItemId"]);
      unique(neighbor.house.stages, (stage) => stage.id, [...path, "house", "stages"]);
      unique(neighbor.house.stages, (stage) => stage.level, [...path, "house", "stages"]);
      neighbor.house.stages.forEach((stage, stageIndex) => {
        for (const group of ["materials", "blueprints"] as const) {
          const amounts = stage.upgradeRequirements?.[group] ?? [];
          unique(amounts, (amount) => amount.itemId, [
            ...path,
            "house",
            "stages",
            stageIndex,
            group,
          ]);
          for (const amount of amounts)
            checkItem(amount.itemId, ["house", "stages", stageIndex, group]);
        }
      });
    }
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
  catalog.records.forEach((record, index) => {
    if (record.kind !== "neighborClothing") return;
    if (record.neighborId !== null && !ids.has(record.neighborId))
      issue(["catalog", "records", index, "neighborId"], `Unknown neighbor ${record.neighborId}`);
    if (record.playerItemId !== null) {
      const playerItem = items.get(record.playerItemId);
      if (playerItem && playerItem.kind !== "clothing")
        issue(["catalog", "records", index, "playerItemId"], "Counterpart must be player clothing");
    }
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
        if (!item || (field === "displayCreatureIds" && item.kind !== "creature"))
          issue([...path, field], `Unknown island item ${id}`);
      }
    }
  });
  return issues;
}
