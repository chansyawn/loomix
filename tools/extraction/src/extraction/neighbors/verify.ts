import { neighborAllowlist, isAllowedNeighbor } from "./allowlist.ts";
import assert from "node:assert/strict";
import { profile } from "../../profile.ts";
import { extractNeighbors } from "./extract.ts";
import { parseNeighborDatabase } from "./schema.ts";
import type { NeighborDatabase, NeighborExtractionInput } from "./types.ts";

export function verifyNeighbors(value: unknown, input: NeighborExtractionInput): NeighborDatabase {
  const database = parseNeighborDatabase(value);
  assert.deepEqual(database.source, input.source, "Neighbor source metadata");
  const { tables } = input;
  const roster = tables
    .rows(profile.roots.neighborsNpc)
    .filter((row) => isAllowedNeighbor(tables.id(row)))
    .map((row) => tables.id(row))
    .sort((a, b) => a - b);
  assert.deepEqual(
    roster,
    neighborAllowlist.map((neighbor) => neighbor.id),
    "Allowlisted masters",
  );
  assert.deepEqual(
    database.neighbors.map((n) => n.id),
    roster,
    "Independently reconstructed neighbor roster",
  );
  // 重新读取冻结的表数据；对外发布的 JSON 及其审计结果均不作为事实依据。
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
    const preferenceCounts = {
      groups: database.giftPreferences.length,
      items: Object.fromEntries(
        (["love", "favor", "dislike"] as const).map((level) => [
          level,
          database.giftPreferences
            .filter((preference) => preference.level === level)
            .reduce((sum, preference) => sum + preference.itemIds.length, 0),
        ]),
      ),
      tags: Object.fromEntries(
        (["love", "favor", "dislike"] as const).map((level) => [
          level,
          database.giftPreferences
            .filter((preference) => preference.level === level)
            .reduce((sum, preference) => sum + preference.tagIds.length, 0),
        ]),
      ),
    };
    assert.deepEqual(
      preferenceCounts,
      profile.expectedNeighborPreferences,
      "Neighbor gift preference counts changed; re-confirm the layout and profile",
    );
    const outfitCounts = {
      total: database.outfits.length,
      matching: database.outfits.filter((outfit) => outfit.relationship === "matching").length,
      neighborSpecific: database.outfits.filter(
        (outfit) => outfit.relationship === "neighbor-specific",
      ).length,
      tokenPricedOutfits: database.outfits.filter((outfit) => outfit.offers.length > 0).length,
      tokenPricedOffers: database.outfits.reduce((sum, outfit) => sum + outfit.offers.length, 0),
    };
    assert.deepEqual(
      outfitCounts,
      profile.expectedNeighborOutfits,
      "Neighbor outfit counts changed; re-confirm the layout and profile",
    );
  }
  return database;
}
