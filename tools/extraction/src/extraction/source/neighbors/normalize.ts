import type { NeighborDatabase } from "./types.ts";

export const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
export const uniqueNumbers = (values: number[]): number[] =>
  [...new Set(values)].sort((a, b) => a - b);

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
  const preferenceLevelOrder = { love: 1, favor: 2, dislike: 4 } as const;
  database.giftPreferences.sort(
    (a, b) => a.npcId - b.npcId || preferenceLevelOrder[a.level] - preferenceLevelOrder[b.level],
  );
  for (const preference of database.giftPreferences) {
    preference.itemIds = uniqueNumbers(preference.itemIds);
    preference.tagIds = uniqueNumbers(preference.tagIds);
  }
  return database;
}

export function normalizeNeighborOutfit<T extends { id: number }>(clothing: T[]): T[] {
  clothing.sort((a, b) => a.id - b.id);
  return clothing;
}
