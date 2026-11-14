import { readRoster, readStars, readStories, readTravelReactions } from "./adapters.ts";
import { readEventTags, readIslands, readRules } from "./system.ts";
import { linkedAssets, readAssets } from "./resources.ts";
import { readGiftPreferences } from "./preferences.ts";
import { readNeighborOutfits } from "./outfits.ts";
import { compareText, normalizeNeighborClothing, normalizeNeighbors } from "./normalize.ts";
import { parseNeighborClothingDatabase, parseNeighborDatabase } from "./schema.ts";
import { profile } from "../../profile.ts";
import type {
  NeighborDatabase,
  NeighborEvidence,
  NeighborExclusion,
  NeighborExtractionAudit,
  NeighborExtractionInput,
  NeighborOutfit,
} from "./types.ts";

export function extractNeighborBundle(input: NeighborExtractionInput): {
  database: NeighborDatabase;
  clothing: NeighborOutfit[];
  audit: NeighborExtractionAudit;
} {
  const { tables, source, assetIndex } = input;
  const records: NeighborEvidence[] = [];
  const exclusions: NeighborExclusion[] = [];
  const neighbors = readRoster(tables, records, exclusions);
  const accepted = new Set(neighbors.map((n) => n.id));
  const giftPreferences = readGiftPreferences(
    tables,
    accepted,
    input.tagIndex,
    records,
    exclusions,
  );
  const outfits = normalizeNeighborClothing(
    readNeighborOutfits(tables, accepted, records, exclusions),
  );
  const clothing = parseNeighborClothingDatabase({
    schemaVersion: 1,
    source,
    items: outfits,
  }).items;
  const database: NeighborDatabase = {
    schemaVersion: 2,
    source: { ...source },
    neighbors,
    stars: readStars(tables, accepted, records),
    stories: readStories(tables, accepted, records),
    travelReactions: readTravelReactions(tables, accepted, records),
    encounterIslands: readIslands(tables, records),
    friendshipRules: readRules(tables, records, exclusions),
    eventTags: readEventTags(tables, records),
    giftPreferences,
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
      giftPreferences: result.giftPreferences.length,
      giftPreferenceItems: Object.fromEntries(
        (["love", "favor", "dislike"] as const).map((level) => [
          level,
          result.giftPreferences
            .filter((preference) => preference.level === level)
            .reduce((sum, preference) => sum + preference.itemIds.length, 0),
        ]),
      ) as NeighborExtractionAudit["counts"]["giftPreferenceItems"],
      giftPreferenceTags: Object.fromEntries(
        (["love", "favor", "dislike"] as const).map((level) => [
          level,
          result.giftPreferences
            .filter((preference) => preference.level === level)
            .reduce((sum, preference) => sum + preference.tagIds.length, 0),
        ]),
      ) as NeighborExtractionAudit["counts"]["giftPreferenceTags"],
      outfits: clothing.length,
      matchingOutfits: clothing.filter((outfit) => outfit.relationship === "matching").length,
      neighborSpecificOutfits: clothing.filter(
        (outfit) => outfit.relationship === "neighbor-specific",
      ).length,
      tokenPricedOutfits: clothing.filter((outfit) => outfit.offers.length > 0).length,
      tokenPricedOffers: clothing.reduce((sum, outfit) => sum + outfit.offers.length, 0),
      assets: result.assets.length,
    },
    exclusions: exclusions.sort((a, b) => compareText(a.kind, b.kind) || compareText(a.key, b.key)),
    records: records.sort(
      (a, b) =>
        compareText(a.collection, b.collection) ||
        compareText(a.key, b.key) ||
        (a.source.kind === "table" ? a.source.rowOffset : 0) -
          (b.source.kind === "table" ? b.source.rowOffset : 0),
    ),
    assetIndexEntries: assetIndex.length,
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
        assets: result.neighbors.reduce((sum, n) => sum + n.assetPaths.length, 0),
      },
    },
  };
  return { database: result, clothing, audit };
}

export function extractNeighbors(input: NeighborExtractionInput): NeighborDatabase {
  return extractNeighborBundle(input).database;
}
