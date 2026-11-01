import type { IndexedAsset } from "../types.ts";
import type { Tables } from "../decode/tables.ts";

import type { NeighborDatabase } from "./schema.ts";
export type { NeighborDatabase } from "./schema.ts";
export type NeighborSource = NeighborDatabase["source"];
export type NeighborRecord = NeighborDatabase["neighbors"][number];
export type NeighborStar = NeighborDatabase["stars"][number];
export type NeighborStoryChapter = NeighborDatabase["stories"][number];
export type NeighborTravelReaction = NeighborDatabase["travelReactions"][number];
export type NeighborEncounterIsland = NeighborDatabase["encounterIslands"][number];
export type NeighborFriendshipRule = NeighborDatabase["friendshipRules"][number];
export type NeighborEventTag = NeighborDatabase["eventTags"][number];
export type NeighborFurnishingTheme = NeighborDatabase["furnishingThemes"][number];
export type NeighborAssetRef = NeighborDatabase["assets"][number];
export type NeighborGiftPreference = NeighborDatabase["giftPreferences"][number];
export type NeighborGiftPreferenceTag = NeighborDatabase["giftPreferenceTags"][number];
export type NeighborOutfit = NeighborDatabase["outfits"][number];
export type NeighborBodyType = NonNullable<NeighborRecord["bodyType"]>;
export type NeighborStoryParagraph = NeighborStoryChapter["paragraphs"][number];

export type GiftPreferenceLevel = "love" | "favor" | "dislike";

export interface PreferenceTagCatalog {
  tags: Map<number, { internalName: string; nameZh: string | null; textId: string | null }>;
  sources: {
    tree: Extract<NeighborEvidenceSource, { kind: "asset" }>;
    display: Extract<NeighborEvidenceSource, { kind: "asset" }>;
  };
}

export interface NeighborExtractionInput {
  tables: Tables;
  source: NeighborSource;
  assetIndex: readonly IndexedAsset[];
  preferenceTags: PreferenceTagCatalog;
}

export interface NeighborExtractionAudit {
  schemaVersion: 1;
  source: NeighborSource;
  counts: {
    neighbors: number;
    stars: number;
    stories: number;
    storyParagraphs: number;
    travelReactions: number;
    fallbackTravelReactions: number;
    encounterIslands: number;
    friendshipRules: number;
    eventTags: number;
    furnishingThemes: number;
    giftPreferences: number;
    giftPreferenceItems: Record<GiftPreferenceLevel, number>;
    giftPreferenceTags: Record<GiftPreferenceLevel, number>;
    outfits: number;
    matchingOutfits: number;
    neighborSpecificOutfits: number;
    tokenPricedOutfits: number;
    tokenPricedOffers: number;
    assets: number;
  };
  exclusions: NeighborExclusion[];
  assetIndexEntries: number;
  records: NeighborEvidence[];
  normalization: {
    assetOccurrences: number;
    uniqueAssetPaths: number;
    assetCountsByKind: Record<string, number>;
    indexedAssetPaths: number;
    associationCounts: {
      stars: number;
      stories: number;
      themes: number;
      assets: number;
    };
  };
}

export interface NeighborExclusion {
  kind: "npc" | "rule" | "asset" | "giftPreference" | "outfit";
  key: string;
  reason: string;
  sources: NeighborEvidenceSource[];
}

export type NeighborEvidenceSource =
  | {
      kind: "table";
      file: "prepared/ed.obb";
      table: number;
      rowOffset: number;
      fields: number[];
    }
  | { kind: "asset"; file: string; pathId: string };

export interface NeighborEvidence {
  collection: keyof Omit<NeighborDatabase, "source" | "schemaVersion">;
  key: string;
  source: NeighborEvidenceSource;
}
