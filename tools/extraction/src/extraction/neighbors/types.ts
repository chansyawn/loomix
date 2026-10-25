import type { Catalog } from "@loomix/content-schema";
import type { IndexedAsset } from "../types.ts";
import type { Tables } from "../decode/tables.ts";

export interface NeighborSource {
  gameVersion: string;
  dataRevision: number;
  resourceRevision: number;
  manifestId: string;
}

export type NeighborBodyType = "small" | "medium" | "big";

export interface NeighborRecord {
  id: number;
  nameZh: string;
  bodyType: NeighborBodyType | null;
  scaleValue: number | null;
  avatarPath: string | null;
  npc2Path: string;
  starKeys: string[];
  storyKeys: string[];
  furnishingThemeIds: number[];
  furnishingThemeKeys: string[];
  rewardItemIds: number[];
  assetPaths: string[];
}

export interface NeighborStar {
  key: string;
  npcId: number;
  galaxyNameZh: string | null;
  galaxyIndex: number | null;
  systemIndex: number | null;
  starIndex: number | null;
  nameZh: string;
  galaxyModelPath: string | null;
  playerModelPath: string | null;
  skyModelPath: string | null;
  illustrationPath: string | null;
}

export interface NeighborStoryParagraph {
  sequence: number;
  bodyZh: string | null;
  illustrationPath: string | null;
}

export interface NeighborStoryChapter {
  key: string;
  npcId: number;
  chapter: number;
  titleZh: string;
  paragraphs: NeighborStoryParagraph[];
}

export interface NeighborTravelReaction {
  key: string;
  npcId: number | null;
  variantId: number;
  conditionType: string | null;
  threshold: string | null;
  resourceCategory: string | null;
  secondaryThreshold: string | null;
  reactionAsset: string | null;
  textZh: string | null;
}

export interface NeighborEncounterIsland {
  id: number;
  sceneId: number;
  nameZh: string;
  galaxyNameZh: string | null;
  neighborIds: number[];
  resourcePaths: string[];
  unlockCondition: string | null;
  illustrationPath: string | null;
}

export interface NeighborFriendshipRule {
  key: string;
  titleZh: string | null;
  textZh: string;
  category: string | null;
  level: number | null;
}

export interface NeighborEventTag {
  key: string;
  textZh: string;
}

export interface NeighborFurnishingTheme {
  id: number | null;
  key: string;
  nameZh: string;
  neighborIds: number[];
  descriptionZh: string | null;
  cardBagPath: string | null;
  cardBackgroundPath: string | null;
  cardBackPath: string | null;
  topicIconPath: string | null;
  lockedBackgroundPath: string | null;
  unlockedBackgroundPath: string | null;
  themePath: string | null;
  coverPath: string | null;
}

export interface NeighborRewardRef {
  itemId: number;
  itemNameZh: string;
  category: string;
  kind: string;
  sources: string[];
  relatedNeighborIds: number[];
}

export interface NeighborAssetRef {
  path: string;
  kind:
    | "house"
    | "friendStar"
    | "outfit"
    | "hub"
    | "favourMission"
    | "storyEnv"
    | "reaction"
    | "other";
  relatedNeighborIds: number[];
}

export interface NeighborDatabase {
  schemaVersion: 1;
  source: NeighborSource;
  neighbors: NeighborRecord[];
  stars: NeighborStar[];
  stories: NeighborStoryChapter[];
  travelReactions: NeighborTravelReaction[];
  encounterIslands: NeighborEncounterIsland[];
  friendshipRules: NeighborFriendshipRule[];
  eventTags: NeighborEventTag[];
  furnishingThemes: NeighborFurnishingTheme[];
  rewards: NeighborRewardRef[];
  assets: NeighborAssetRef[];
}

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
