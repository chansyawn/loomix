import { readRoster, readStars, readStories, readTravelReactions } from "./adapters.ts";
import { readEventTags, readIslands, readRules, readThemes } from "./system.ts";
import { linkedAssets, readAssets, readRewards } from "./resources.ts";
import { compareText, normalizeNeighbors } from "./normalize.ts";
import { parseNeighborDatabase } from "./schema.ts";
import { profile } from "../../profile.ts";
import type {
  NeighborDatabase,
  NeighborEvidence,
  NeighborExclusion,
  NeighborExtractionAudit,
  NeighborExtractionInput,
} from "./types.ts";

export function extractNeighborBundle(input: NeighborExtractionInput): {
  database: NeighborDatabase;
  audit: NeighborExtractionAudit;
} {
  const { tables, content, source, assetIndex } = input;
  if (
    content.source.gameVersion !== source.gameVersion ||
    content.source.dataRevision !== source.dataRevision ||
    content.source.resourceRevision !== source.resourceRevision
  )
    throw new Error("Neighbor source differs from content source");
  const records: NeighborEvidence[] = [];
  const exclusions: NeighborExclusion[] = [];
  const neighbors = readRoster(tables, records, exclusions);
  const accepted = new Set(neighbors.map((n) => n.id));
  const database: NeighborDatabase = {
    schemaVersion: 1,
    source: { ...source },
    neighbors,
    stars: readStars(tables, accepted, records),
    stories: readStories(tables, accepted, records),
    travelReactions: readTravelReactions(tables, accepted, records),
    encounterIslands: readIslands(tables, records),
    friendshipRules: readRules(tables, records, exclusions),
    eventTags: readEventTags(tables, records),
    furnishingThemes: readThemes(tables, neighbors, records),
    rewards: readRewards(content, neighbors, tables),
    assets: readAssets(tables, records, exclusions),
  };
  database.assets = linkedAssets(database);
  const assetOccurrences = database.assets.length;
  normalizeNeighbors(database);
  const result = parseNeighborDatabase(database);
  const indexed = new Set(
    assetIndex
      .map((a) =>
        a.Container?.replaceAll("\\", "/")
          .toLowerCase()
          .replace(profile.assetPrefix, "")
          .replace(/[.]png$/, ""),
      )
      .filter((s): s is string => !!s),
  );
  const audit: NeighborExtractionAudit = {
    schemaVersion: 1,
    source: { ...source },
    counts: {
      neighbors: result.neighbors.length,
      stars: result.stars.length,
      stories: result.stories.length,
      storyParagraphs: result.stories.reduce((sum, s) => sum + s.paragraphs.length, 0),
      travelReactions: result.travelReactions.length,
      fallbackTravelReactions: result.travelReactions.filter((r) => r.npcId === null).length,
      encounterIslands: result.encounterIslands.length,
      friendshipRules: result.friendshipRules.length,
      eventTags: result.eventTags.length,
      furnishingThemes: result.furnishingThemes.length,
      rewards: result.rewards.length,
      assets: result.assets.length,
    },
    exclusions: exclusions.sort((a, b) => compareText(a.kind, b.kind) || compareText(a.key, b.key)),
    records: records.sort(
      (a, b) =>
        compareText(a.collection, b.collection) ||
        compareText(a.key, b.key) ||
        a.source.rowOffset - b.source.rowOffset,
    ),
    assetIndexEntries: assetIndex.length,
    catalogReferences: result.rewards.map((reward) => ({
      itemId: reward.itemId,
      file: "raw/content.json",
      pointer: `/items/${content.items.findIndex((item) => item.id === reward.itemId)}`,
    })),
    normalization: {
      assetOccurrences,
      uniqueAssetPaths: result.assets.length,
      assetCountsByKind: Object.fromEntries(
        [
          "house",
          "friendStar",
          "outfit",
          "hub",
          "favourMission",
          "storyEnv",
          "reaction",
          "other",
        ].map((kind) => [kind, result.assets.filter((a) => a.kind === kind).length]),
      ),
      indexedAssetPaths: result.assets.filter((a) =>
        indexed.has(a.path.toLowerCase().replace(/[.]png$/, "")),
      ).length,
      associationCounts: {
        stars: result.neighbors.reduce((sum, n) => sum + n.starKeys.length, 0),
        stories: result.neighbors.reduce((sum, n) => sum + n.storyKeys.length, 0),
        themes: result.neighbors.reduce((sum, n) => sum + n.furnishingThemeKeys.length, 0),
        rewards: result.neighbors.reduce((sum, n) => sum + n.rewardItemIds.length, 0),
        assets: result.neighbors.reduce((sum, n) => sum + n.assetPaths.length, 0),
      },
    },
  };
  return { database: result, audit };
}

export function extractNeighbors(input: NeighborExtractionInput): NeighborDatabase {
  return extractNeighborBundle(input).database;
}
