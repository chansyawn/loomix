import { createIssueCollector } from "../common/identity.ts";
import type { ValidationIssue } from "../common/identity.ts";
import { growthPlantIds, validateGrowth } from "./growth.ts";
import type { Catalog } from "./index.ts";
import type { Item, ItemKind } from "./items.ts";

export function validateCatalog(catalog: Catalog): ValidationIssue[] {
  const { issues, issue, unique } = createIssueCollector("invalid_reference", ["catalog"]);
  unique([...catalog.items, ...catalog.collections], (entry) => entry.id, ["entries"]);
  unique(catalog.inspoBoxes, (entry) => entry.id, ["inspoBoxes"]);
  const inspoBoxs = new Set(catalog.inspoBoxes.map((entry) => entry.id));
  const usedInspoBoxs = new Set<number>();
  const items = new Map<number, Item>(catalog.items.map((item) => [item.id, item]));
  const checkItems = (
    ids: readonly number[],
    path: (string | number)[],
    kinds?: readonly ItemKind[],
  ) => {
    unique(ids, (id) => id, path);
    ids.forEach((id, index) => {
      const kind = items.get(id)?.kind;
      if (!kind || (kinds && !kinds.includes(kind)))
        issue([...path, index], `Unknown ${kinds?.join("/") ?? "item"} ${id}`);
    });
  };
  catalog.items.forEach((item, index) => {
    const path = ["items", index];
    if (item.kind === "reference") return;
    unique(item.tagIds, (id) => id, [...path, "tagIds"]);
    switch (item.kind) {
      case "inspoCard": {
        const product = items.get(item.recipe.productId);
        if (!product || product.kind === "reference" || product.id === item.id)
          issue(
            [...path, "recipe", "productId"],
            `Unknown formal product ${item.recipe.productId}`,
          );
        if (!(product && product.kind !== "reference" && product.image) && !item.image)
          issue([...path, "front"], `Missing usable foreground for creation card ${item.id}`);
        if (item.inspoBoxId !== null) {
          if (!inspoBoxs.has(item.inspoBoxId))
            issue([...path, "inspoBoxId"], `Unknown creation card set ${item.inspoBoxId}`);
          usedInspoBoxs.add(item.inspoBoxId);
        }
        checkItems(item.recipe.materials?.map((material) => material.itemId) ?? [], [
          ...path,
          "recipe",
          "materials",
        ]);
        break;
      }
      case "neighborOutfit":
        if (item.neighborId === null && item.playerItemId === null)
          issue([...path, "neighborId"], "Neighbor clothing needs a resolvable association");
        unique(item.bodyTypes, (type) => type, [...path, "bodyTypes"]);
        if (item.playerItemId !== null)
          checkItems([item.playerItemId], [...path, "playerItemId"], ["clothing", "reference"]);
        break;
      case "creature":
        if (item.size && item.size.min > item.size.max) issue([...path, "size"], "Invalid range");
        break;
      case "plant":
        unique(item.drops ?? [], (drop) => `${drop.source}:${drop.itemId}`, [...path, "drops"]);
        for (const drop of item.drops ?? []) checkItems([drop.itemId], [...path, "drops"]);
        break;
      case "seed":
        for (const message of validateGrowth(item.growth)) issue([...path, "growth"], message);
        checkItems(growthPlantIds(item.growth), [...path, "growth", "stages"], ["plant"]);
        break;
      case "dish":
        item.cooking?.slots.forEach((slot, slotIndex) =>
          checkItems(slot.itemIds, [...path, "cooking", "slots", slotIndex, "itemIds"]),
        );
        if (item.cooking?.tastes)
          unique(item.cooking.tastes, (taste) => taste, [...path, "cooking", "tastes"]);
        break;
    }
  });
  catalog.collections.forEach((collection, index) => {
    if (collection.memberIds !== null)
      checkItems(
        collection.memberIds,
        ["collections", index, "memberIds"],
        [collection.memberKind],
      );
  });
  catalog.inspoBoxes.forEach((entry, index) => {
    if (!usedInspoBoxs.has(entry.id))
      issue(["inspoBoxes", index], `Creation card set ${entry.id} has no admitted cards`);
  });
  return issues;
}
