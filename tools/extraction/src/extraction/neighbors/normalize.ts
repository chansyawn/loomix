import type { NeighborDatabase, NeighborTravelReaction } from "./types.ts";

export const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const uniqueNumbers = (values: number[]): number[] =>
  [...new Set(values)].sort((a, b) => a - b);
export const uniqueText = (values: string[]): string[] => [...new Set(values)].sort(compareText);

export function compareReactions(a: NeighborTravelReaction, b: NeighborTravelReaction): number {
  return (
    (a.npcId ?? 0) - (b.npcId ?? 0) ||
    compareText(a.conditionType ?? "", b.conditionType ?? "") ||
    compareText(a.threshold ?? "", b.threshold ?? "") ||
    compareText(a.resourceCategory ?? "", b.resourceCategory ?? "") ||
    compareText(a.secondaryThreshold ?? "", b.secondaryThreshold ?? "") ||
    compareText(a.reactionAsset ?? "", b.reactionAsset ?? "") ||
    a.variantId - b.variantId
  );
}

export function normalizeNeighbors(database: NeighborDatabase): NeighborDatabase {
  database.neighbors.sort((a, b) => a.id - b.id);
  database.stars.sort(
    (a, b) =>
      a.npcId - b.npcId ||
      (a.galaxyIndex ?? 0) - (b.galaxyIndex ?? 0) ||
      (a.systemIndex ?? 0) - (b.systemIndex ?? 0) ||
      (a.starIndex ?? 0) - (b.starIndex ?? 0),
  );
  database.stories.sort((a, b) => a.npcId - b.npcId || a.chapter - b.chapter);
  for (const story of database.stories) story.paragraphs.sort((a, b) => a.sequence - b.sequence);
  database.travelReactions.sort(compareReactions);
  database.encounterIslands.sort((a, b) => a.id - b.id);
  database.friendshipRules.sort((a, b) => compareText(a.key, b.key));
  database.eventTags.sort((a, b) => compareText(a.key, b.key));
  database.furnishingThemes.sort((a, b) => compareText(a.key, b.key));
  database.rewards.sort((a, b) => a.itemId - b.itemId);
  const assets = new Map<string, NeighborDatabase["assets"][number]>();
  for (const asset of database.assets) {
    const previous = assets.get(asset.path);
    if (!previous)
      assets.set(asset.path, { ...asset, relatedNeighborIds: [...asset.relatedNeighborIds] });
    else {
      if (previous.kind !== asset.kind && previous.kind !== "other" && asset.kind !== "other")
        throw new Error(`Conflicting asset kind ${asset.path}`);
      if (previous.kind === "other") previous.kind = asset.kind;
      previous.relatedNeighborIds.push(...asset.relatedNeighborIds);
    }
  }
  database.assets = [...assets.values()].sort((a, b) => compareText(a.path, b.path));
  for (const asset of database.assets)
    asset.relatedNeighborIds = uniqueNumbers(asset.relatedNeighborIds);
  for (const neighbor of database.neighbors) {
    neighbor.starKeys = database.stars.filter((s) => s.npcId === neighbor.id).map((s) => s.key);
    neighbor.storyKeys = database.stories.filter((s) => s.npcId === neighbor.id).map((s) => s.key);
    neighbor.furnishingThemeIds = database.furnishingThemes.flatMap((t) =>
      t.id !== null && t.neighborIds.includes(neighbor.id) ? [t.id] : [],
    );
    neighbor.furnishingThemeIds.sort((a, b) => a - b);
    neighbor.furnishingThemeKeys = database.furnishingThemes
      .filter((t) => t.neighborIds.includes(neighbor.id))
      .map((t) => t.key);
    neighbor.rewardItemIds = database.rewards
      .filter((r) => r.relatedNeighborIds.includes(neighbor.id))
      .map((r) => r.itemId);
    neighbor.assetPaths = database.assets
      .filter((a) => a.relatedNeighborIds.includes(neighbor.id))
      .map((a) => a.path);
  }
  return database;
}
