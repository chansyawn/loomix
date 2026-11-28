import type { NeighborDatabase } from "./schema.ts";

export function neighborReferencedItemIds(database: NeighborDatabase): number[] {
  const ids = new Set(database.giftPreferences.flatMap((preference) => preference.itemIds));
  for (const neighbor of database.neighbors) {
    for (const { upgrade } of neighbor.house?.stages ?? []) {
      if (!upgrade) continue;
      ids.add(upgrade.blueprint.itemId);
      for (const material of upgrade.materials) ids.add(material.itemId);
    }
  }
  return [...ids].sort((first, second) => first - second);
}
