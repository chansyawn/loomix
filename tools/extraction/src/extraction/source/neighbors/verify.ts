import { verifyNeighborDetails } from "./verify-details.ts";
import { neighborAllowlist, isAllowedNeighbor } from "./allowlist.ts";
import assert from "node:assert/strict";
import { profile } from "../../../profile.ts";
import { StoryLayoutSchema } from "@loomix/schema/neighbors";
import { extractNeighborBundle, extractNeighbors } from "./extract.ts";
import { parseNeighborOutfitDatabase, parseNeighborDatabase } from "./schema.ts";
import type { NeighborDatabase, NeighborExtractionInput } from "./types.ts";

export function verifyNeighbors(value: unknown, input: NeighborExtractionInput): NeighborDatabase {
  const database = parseNeighborDatabase(value);
  assert.deepEqual(database.source, input.source, "Neighbor source metadata");
  const { tables } = input;
  verifyNeighborDetails(database, tables);
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
    };
    assert.deepEqual(
      counts,
      profile.expectedNeighbors,
      "Neighbor snapshot counts changed; re-confirm the layout and profile",
    );
    const details = database.neighbors;
    assert.deepEqual(
      {
        profiles: details.length,
        birthdays: details.filter((neighbor) => neighbor.profile.birthday !== null).length,
        nicknames: details.filter((neighbor) => neighbor.profile.nickname !== null).length,
        abilityNeighbors: details.filter((neighbor) => neighbor.abilities.length > 0).length,
        abilities: details.reduce((sum, neighbor) => sum + neighbor.abilities.length, 0),
        houses: details.filter((neighbor) => neighbor.house !== null).length,
        stages: details.reduce((sum, neighbor) => sum + (neighbor.house?.stages.length ?? 0), 0),
        houseDescriptions: details
          .flatMap((neighbor) => neighbor.house?.stages ?? [])
          .filter((stage) => stage.description !== null).length,
      },
      profile.expectedNeighborDetails,
      "Neighbor detail coverage and semantic admission baseline",
    );
    const paragraphs = database.stories.flatMap((story) => story.paragraphs);
    assert.deepEqual(
      Object.fromEntries(
        StoryLayoutSchema.options.map((layout) => [
          layout,
          paragraphs.filter((paragraph) => paragraph.layout === layout).length,
        ]),
      ),
      profile.expectedStoryLayouts,
      "Neighbor story layouts changed; re-confirm the client snapshot",
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
  }
  return database;
}

export function verifyNeighborOutfit(value: unknown, input: NeighborExtractionInput) {
  const clothing = parseNeighborOutfitDatabase(value);
  const extracted = extractNeighborBundle(input);
  assert.deepEqual(clothing.source, input.source, "Neighbor clothing source metadata");
  assert.deepEqual(
    clothing.items,
    extracted.clothing,
    "Neighbor clothing differs from frozen sources",
  );
  if (clothing.source.manifestId === profile.manifestId)
    assert.deepEqual(
      {
        total: clothing.items.length,
        matching: clothing.items.filter((item) => item.relationship === "matching").length,
        neighborSpecific: clothing.items.filter((item) => item.relationship === "neighbor-specific")
          .length,
        tokenPricedOutfits: clothing.items.filter((item) => item.offers.length > 0).length,
        tokenPricedOffers: clothing.items.reduce((sum, item) => sum + item.offers.length, 0),
      },
      profile.expectedNeighborOutfits,
      "Neighbor clothing counts changed; re-confirm the layout and profile",
    );
  return clothing;
}
