import { createFlowerDyeingMatcher, type HairDyeing } from "@loomix/schema/hair-dyeing";
import type { DyeingItem } from "./hair-dyeing";

export function flowerDyeingUses(
  data: HairDyeing,
  itemId: number,
  items: ReadonlyMap<number, DyeingItem>,
) {
  const match = createFlowerDyeingMatcher(data);
  const single = match(itemId);
  const partners = new Map<number, DyeingItem[]>();
  for (const candidate of data.flowerInputs) {
    const rule = match(itemId, candidate.itemId);
    const item = items.get(candidate.itemId);
    if (!rule || !item) continue;
    const group = partners.get(rule.groupId);
    if (group) group.push(item);
    else partners.set(rule.groupId, [item]);
  }
  return data.colorGroups
    .filter((group) => group.id === single?.groupId || partners.has(group.id))
    .sort((left, right) => left.unlock.sort - right.unlock.sort || left.id - right.id)
    .map((group) => ({
      id: group.id,
      name: group.name?.trim() || `色系 #${group.id}`,
      single: single?.groupId === group.id,
      partners: partners.get(group.id) ?? [],
      hairstyles: data.hairstyleConfigs.flatMap((config) =>
        config.regions.some((region) => region.colorGroupIds?.includes(group.id))
          ? (items.get(config.itemId) ?? [])
          : [],
      ),
    }));
}
