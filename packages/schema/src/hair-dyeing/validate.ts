import type { Item } from "../catalog/items.ts";
import { createIssueCollector } from "../common/identity.ts";
import type { HairDyeing } from "./index.ts";

export function validateHairDyeing(data: HairDyeing, items: ReadonlyMap<number, Item>) {
  const { issues, issue, unique } = createIssueCollector("invalid_hair_dyeing_reference");
  const groups = new Map(data.colorGroups.map((group) => [group.id, group]));
  const blocks = new Set(data.colorBlocks.map((block) => block.id));
  unique(data.hairstyleConfigs, (entry) => entry.itemId, ["hairDyeing", "hairstyleConfigs"]);
  unique(data.flowerInputs, (entry) => entry.itemId, ["hairDyeing", "flowerInputs"]);
  unique(data.flowerRules, (entry) => entry.id, ["hairDyeing", "flowerRules"]);
  unique(data.colorGroups, (entry) => entry.id, ["hairDyeing", "colorGroups"]);
  unique(data.colorBlocks, (entry) => entry.id, ["hairDyeing", "colorBlocks"]);
  for (const [index, entry] of data.hairstyleConfigs.entries()) {
    const path = ["hairDyeing", "hairstyleConfigs", index];
    const item = items.get(entry.itemId);
    if (item?.kind !== "appearance" || item.category !== "发型")
      issue([...path, "itemId"], `Expected a listed hairstyle ${entry.itemId}`);
    unique(entry.regions, (region) => region.id, [...path, "regions"]);
    for (const [regionIndex, region] of entry.regions.entries()) {
      const regionPath = [...path, "regions", regionIndex];
      unique(region.colorGroupIds ?? [], (id) => id, [...regionPath, "colorGroupIds"]);
      for (const id of region.colorGroupIds ?? [])
        if (!groups.has(id)) issue([...regionPath, "colorGroupIds"], `Unknown color group ${id}`);
      if (region.defaultColorBlockId !== null && !blocks.has(region.defaultColorBlockId))
        issue(
          [...regionPath, "defaultColorBlockId"],
          `Unknown color block ${region.defaultColorBlockId}`,
        );
    }
  }
  for (const [index, entry] of data.flowerInputs.entries()) {
    const path = ["hairDyeing", "flowerInputs", index];
    const item = items.get(entry.itemId);
    if (item?.kind !== "plant" || item.category !== "花")
      issue([...path, "itemId"], `Expected a listed flower ${entry.itemId}`);
    unique(entry.colorTags, (tag) => tag, [...path, "colorTags"]);
  }
  for (const [index, rule] of data.flowerRules.entries()) {
    const path = ["hairDyeing", "flowerRules", index];
    if (!groups.get(rule.groupId)?.unlock.flowerMatchEnabled)
      issue([...path, "groupId"], `Color group does not support flower matching ${rule.groupId}`);
  }
  for (const [index, group] of data.colorGroups.entries()) {
    const path = ["hairDyeing", "colorGroups", index];
    unique(group.colorBlockIds, (id) => id, [...path, "colorBlockIds"]);
    for (const id of group.colorBlockIds)
      if (!blocks.has(id)) issue([...path, "colorBlockIds"], `Unknown color block ${id}`);
    for (const field of ["unlockCost", "dyeCost"] as const) {
      const cost = group.unlock[field];
      if (cost && !items.has(cost.itemId))
        issue([...path, "unlock", field], `Unknown dye material ${cost.itemId}`);
    }
  }
  return issues;
}
