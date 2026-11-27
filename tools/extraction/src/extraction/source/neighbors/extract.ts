import { enrichFieldEvidence } from "./observations.ts";
import { readProfile } from "./profiles.ts";
import { readAbilities } from "./abilities.ts";
import { readHouse } from "./housing.ts";
import { readRoster, readStars, readStories } from "./adapters.ts";
import { readGiftPreferences } from "./preferences.ts";
import { readNeighborOutfits } from "./outfits.ts";
import { compareText, normalizeNeighborOutfit, normalizeNeighbors } from "./normalize.ts";
import { parseNeighborOutfitDatabase, parseNeighborDatabase } from "./schema.ts";
import type {
  GiftPreferenceLevel,
  NeighborDatabase,
  NeighborEvidence,
  NeighborExclusion,
  NeighborExtractionAudit,
  NeighborExtractionInput,
  NeighborOutfit,
} from "./types.ts";

const giftLevels: readonly GiftPreferenceLevel[] = ["love", "favor", "dislike"];

export function extractNeighborBundle(input: NeighborExtractionInput): {
  database: NeighborDatabase;
  clothing: NeighborOutfit[];
  clothingSources: Map<number, import("./types.ts").NeighborEvidenceSource[]>;
  audit: NeighborExtractionAudit;
} {
  const { tables, source } = input;
  const records: NeighborEvidence[] = [];
  const exclusions: NeighborExclusion[] = [];
  const neighbors = readRoster(tables, records, exclusions).map((neighbor) => ({
    ...neighbor,
    ...readProfile(tables, neighbor.id, records),
    ...readAbilities(tables, neighbor.id, records),
    house: readHouse(tables, neighbor.id, records),
  }));
  const accepted = new Set(neighbors.map((n) => n.id));
  const giftPreferences = readGiftPreferences(
    tables,
    accepted,
    input.tagIndex,
    records,
    exclusions,
  );
  const outfitReadings = readNeighborOutfits(tables, accepted, records, exclusions);
  const clothing = parseNeighborOutfitDatabase({
    source,
    items: normalizeNeighborOutfit(outfitReadings.map((reading) => reading.value)),
  }).items;
  const database: NeighborDatabase = {
    source: { ...source },
    neighbors,
    stars: readStars(tables, accepted, records),
    stories: readStories(tables, accepted, records),
    giftPreferences,
  };
  normalizeNeighbors(database);
  const result = parseNeighborDatabase(database);
  enrichFieldEvidence(tables, records);
  const giftCounts = (field: "itemIds" | "tagIds") =>
    Object.fromEntries(
      giftLevels.map((level) => [
        level,
        result.giftPreferences
          .filter((preference) => preference.level === level)
          .reduce((sum, preference) => sum + preference[field].length, 0),
      ]),
    ) as Record<GiftPreferenceLevel, number>;
  const audit: NeighborExtractionAudit = {
    source: { ...source },
    counts: {
      neighbors: result.neighbors.length,
      stars: result.stars.length,
      stories: result.stories.length,
      storyParagraphs: result.stories.reduce((sum, s) => sum + s.paragraphs.length, 0),
      giftPreferences: result.giftPreferences.length,
      giftPreferenceItems: giftCounts("itemIds"),
      giftPreferenceTags: giftCounts("tagIds"),
      outfits: clothing.length,
      matchingOutfits: clothing.filter((outfit) => outfit.relationship === "matching").length,
      neighborSpecificOutfits: clothing.filter(
        (outfit) => outfit.relationship === "neighbor-specific",
      ).length,
    },
    exclusions: exclusions.sort((a, b) => compareText(a.kind, b.kind) || compareText(a.key, b.key)),
    records: records.sort(
      (a, b) =>
        compareText(a.collection, b.collection) ||
        compareText(a.key, b.key) ||
        (a.source.kind === "table" ? a.source.rowOffset : 0) -
          (b.source.kind === "table" ? b.source.rowOffset : 0),
    ),
  };
  return {
    database: result,
    clothing,
    clothingSources: new Map(outfitReadings.map((reading) => [reading.value.id, reading.sources])),
    audit,
  };
}

export function extractNeighbors(input: NeighborExtractionInput): NeighborDatabase {
  return extractNeighborBundle(input).database;
}
