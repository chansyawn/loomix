import type { Catalog } from "@loomix/schema/extraction";
import type { IndexedAsset } from "../types.ts";
import type { Tables } from "../decode/tables.ts";

import type { NeighborDatabase } from "@loomix/schema/extraction/neighbor";
export type { NeighborDatabase } from "@loomix/schema/extraction/neighbor";
export type NeighborSource = NeighborDatabase["source"];
export type NeighborRecord = NeighborDatabase["neighbors"][number];
export type NeighborStar = NeighborDatabase["stars"][number];
export type NeighborStoryChapter = NeighborDatabase["stories"][number];
export type NeighborTravelReaction = NeighborDatabase["travelReactions"][number];
export type NeighborEncounterIsland = NeighborDatabase["encounterIslands"][number];
export type NeighborFriendshipRule = NeighborDatabase["friendshipRules"][number];
export type NeighborEventTag = NeighborDatabase["eventTags"][number];
export type NeighborFurnishingTheme = NeighborDatabase["furnishingThemes"][number];
export type NeighborRewardRef = NeighborDatabase["rewards"][number];
export type NeighborAssetRef = NeighborDatabase["assets"][number];
export type NeighborBodyType = NonNullable<NeighborRecord["bodyType"]>;
export type NeighborStoryParagraph = NeighborStoryChapter["paragraphs"][number];

export interface NeighborExtractionInput {
  tables: Tables;
  content: Catalog;
  source: NeighborSource;
  assetIndex: readonly IndexedAsset[];
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
    rewards: number;
    assets: number;
  };
  exclusions: NeighborExclusion[];
  assetIndexEntries: number;
  catalogReferences: { itemId: number; file: "raw/content.json"; pointer: string }[];
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
      rewards: number;
      assets: number;
    };
  };
}

export interface NeighborExclusion {
  kind: "npc" | "rule" | "asset";
  key: string;
  reason: string;
  sources: NeighborEvidenceSource[];
}

export interface NeighborEvidenceSource {
  file: "prepared/ed.obb";
  table: number;
  rowOffset: number;
  fields: number[];
}

export interface NeighborEvidence {
  collection: keyof Omit<NeighborDatabase, "source" | "schemaVersion">;
  key: string;
  source: NeighborEvidenceSource;
}
