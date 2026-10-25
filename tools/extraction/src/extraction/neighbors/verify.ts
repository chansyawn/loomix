import assert from "node:assert/strict";
import { profile } from "../../profile.ts";
import { extractNeighbors } from "./extract.ts";
import { parseNeighborDatabase } from "./schema.ts";
import type { NeighborDatabase, NeighborExtractionInput } from "./types.ts";

export function verifyNeighbors(value: unknown, input: NeighborExtractionInput): NeighborDatabase {
  const database = parseNeighborDatabase(value);
  assert.deepEqual(database.source, input.source, "Neighbor source metadata");
  const { tables } = input;
  const candidates = new Set<number>();
  for (const [root, field] of [
    [profile.roots.neighborStars, 5],
    [profile.roots.neighborTravelReactions, 0],
    [profile.roots.neighborStories, 0],
  ])
    for (const row of tables.rows(root!)) {
      const id = tables.uint(row, field!);
      if (id !== null) candidates.add(id);
    }
  const roster = tables
    .rows(profile.roots.neighborsNpc)
    .filter((row) => candidates.has(tables.id(row)))
    .filter((row) => {
      const name = tables.text(row, 1);
      return name?.trim() && !/test|测试|占位/i.test(name) && tables.string(row, 3);
    })
    .map((row) => tables.id(row))
    .sort((a, b) => a - b);
  assert.deepEqual(
    database.neighbors.map((n) => n.id),
    roster,
    "Independently reconstructed neighbor roster",
  );
  // Re-read the frozen tables and catalog; neither the public JSON nor its audit is a source of truth.
  assert.deepEqual(
    database,
    extractNeighbors(input),
    "Neighbor database differs from frozen sources",
  );
  if (
    database.source.gameVersion === profile.gameVersion &&
    database.source.dataRevision === profile.dataRevision &&
    database.source.resourceRevision === profile.resourceRevision &&
    database.source.manifestId === profile.manifestId
  ) {
    const counts = {
      neighbors: database.neighbors.length,
      stars: database.stars.length,
      stories: database.stories.length,
      storyParagraphs: database.stories.reduce((sum, s) => sum + s.paragraphs.length, 0),
      travelReactions: database.travelReactions.length,
      fallbackTravelReactions: database.travelReactions.filter((r) => r.npcId === null).length,
      encounterIslands: database.encounterIslands.length,
      friendshipRules: database.friendshipRules.length,
      eventTags: database.eventTags.length,
      furnishingThemes: database.furnishingThemes.length,
      rewards: database.rewards.length,
      housePaths: database.assets.filter((a) => /NPCBldg/i.test(a.path)).length,
      friendStarPaths: database.assets.filter((a) => a.kind === "friendStar").length,
      outfitPaths: database.assets.filter((a) => a.kind === "outfit").length,
      hubPaths: database.assets.filter((a) => a.kind === "hub").length,
      favourMissionPaths: database.assets.filter((a) => a.kind === "favourMission").length,
    };
    assert.deepEqual(
      counts,
      profile.expectedNeighbors,
      "Neighbor snapshot counts changed; re-confirm the layout and profile",
    );
  }
  for (const reward of database.rewards) {
    const item = input.content.items.find((item) => item.id === reward.itemId);
    assert.ok(item && item.kind === "item", `Unknown neighbor reward ${reward.itemId}`);
    assert.equal(item.name, reward.itemNameZh, "Reward item name");
    assert.equal(item.category, reward.category, "Reward item category");
    assert.equal(item.kind, reward.kind, "Reward item kind");
  }
  return database;
}
