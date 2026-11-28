import { createGameplayTagIndex, validateGameplayTags } from "../gameplay-tags/index.ts";
import type { Dataset } from "./index.ts";
import { ingredientExpressionTagIds } from "../catalog/recipes.ts";
import { validateCatalog } from "../catalog/validate.ts";
import { createIssueCollector } from "../common/identity.ts";
import type { ValidationIssue } from "../common/identity.ts";
import { GiftLevelSchema } from "../neighbors/index.ts";
import { validateStarsea } from "../starsea/validate.ts";
import { validateVignettes } from "../vignettes/validate.ts";
import { validateHairDyeing } from "../hair-dyeing/validate.ts";

export function validateDataset(dataset: Dataset): ValidationIssue[] {
  const treeIssues = validateGameplayTags(dataset.gameplayTags.tags);
  const { issues, issue, unique } = createIssueCollector("invalid_reference");
  issues.push(...treeIssues, ...validateCatalog(dataset.catalog));
  const { catalog, neighbors } = dataset;
  const tags = new Set(dataset.gameplayTags.tags.map((tag) => tag.id));
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const neighborIds = new Set(neighbors.neighbors.map((neighbor) => neighbor.id));
  issues.push(...validateStarsea(dataset.starsea, items, neighborIds));
  issues.push(...validateVignettes(dataset.vignettes, items, tags, neighborIds));
  issues.push(...validateHairDyeing(dataset.hairDyeing, items));
  const checkTags = (ids: readonly number[], path: (string | number)[]) => {
    for (const id of ids) if (!tags.has(id)) issue(path, `Unknown tag ${id}`);
  };
  const tagIndex = treeIssues.length ? null : createGameplayTagIndex(dataset.gameplayTags.tags);
  const ingredientRoot = tagIndex?.findByName("食材");
  const ingredientTags = new Set(
    ingredientRoot ? tagIndex!.subtree(ingredientRoot.id).map((tag) => tag.id) : [],
  );
  catalog.items.forEach((item, index) => {
    const path = ["catalog", "items", index];
    if (item.kind === "reference") return;
    checkTags(item.tagIds, [...path, "tagIds"]);
    if (item.kind === "neighborOutfit" && item.neighborId !== null)
      if (!neighborIds.has(item.neighborId))
        issue([...path, "neighborId"], `Unknown neighbor ${item.neighborId}`);
    if (item.kind === "dish")
      item.cooking?.slots.forEach((slot, slotIndex) => {
        for (const id of ingredientExpressionTagIds(slot.expression))
          if (!ingredientTags.has(id))
            issue([...path, "cooking", "slots", slotIndex], `Unknown ingredient tag ${id}`);
      });
  });
  unique(neighbors.neighbors, (neighbor) => neighbor.id, ["neighbors", "neighbors"]);
  neighbors.neighbors.forEach((neighbor, index) => {
    const path = ["neighbors", "neighbors", index];
    unique(neighbor.stories, (story) => story.chapter, [...path, "stories"]);
    unique(neighbor.abilities, (ability) => ability.unlockLevel, [...path, "abilities"]);
    if (neighbor.house) {
      unique(neighbor.house.stages, (stage) => stage.id, [...path, "house", "stages"]);
      unique(neighbor.house.stages, (stage) => stage.level, [...path, "house", "stages"]);
      neighbor.house.stages.forEach(({ upgrade }, stageIndex) => {
        if (!upgrade) return;
        const upgradePath = [...path, "house", "stages", stageIndex, "upgrade"];
        unique(upgrade.materials, (material) => material.itemId, [...upgradePath, "materials"]);
        upgrade.materials.forEach(({ itemId }, index) => {
          if (!items.has(itemId))
            issue([...upgradePath, "materials", index, "itemId"], `Unknown material ${itemId}`);
        });
        if (!items.has(upgrade.blueprint.itemId))
          issue(
            [...upgradePath, "blueprint", "itemId"],
            `Unknown blueprint ${upgrade.blueprint.itemId}`,
          );
      });
    }
    for (const level of GiftLevelSchema.options) {
      const gift = neighbor.gifts[level];
      const giftPath = [...path, "gifts", level];
      unique(gift.itemIds, (id) => id, [...giftPath, "itemIds"]);
      unique(gift.tagIds, (id) => id, [...giftPath, "tagIds"]);
      for (const id of gift.itemIds)
        if (!items.has(id)) issue([...giftPath, "itemIds"], `Unknown item ${id}`);
      checkTags(gift.tagIds, [...giftPath, "tagIds"]);
    }
  });
  return issues;
}
