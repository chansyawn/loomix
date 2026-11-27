import type { Tables } from "../decode/tables.ts";

import type { NeighborDatabase } from "./schema.ts";
export type { NeighborDatabase } from "./schema.ts";
export type NeighborSource = NeighborDatabase["source"];
export type NeighborRecord = NeighborDatabase["neighbors"][number];
export type NeighborStar = NeighborDatabase["stars"][number];
export type NeighborStoryChapter = NeighborDatabase["stories"][number];
export type NeighborGiftPreference = NeighborDatabase["giftPreferences"][number];
export type NeighborOutfit = import("./schema.ts").NeighborOutfit;
export type NeighborBodyType = NonNullable<NeighborRecord["bodyType"]>;
export type NeighborStoryParagraph = NeighborStoryChapter["paragraphs"][number];

export type GiftPreferenceLevel = "love" | "favor" | "dislike";

export interface NeighborExtractionInput {
  tables: Tables;
  source: NeighborSource;
  tagIndex: import("../gameplay-tags/client.ts").ClientGameplayTagIndex;
}

export interface NeighborExtractionAudit {
  source: NeighborSource;
  counts: {
    neighbors: number;
    stars: number;
    stories: number;
    storyParagraphs: number;
    giftPreferences: number;
    giftPreferenceItems: Record<GiftPreferenceLevel, number>;
    giftPreferenceTags: Record<GiftPreferenceLevel, number>;
    outfits: number;
    matchingOutfits: number;
    neighborSpecificOutfits: number;
  };
  exclusions: NeighborExclusion[];
  records: NeighborEvidence[];
}

export interface NeighborExclusion {
  kind: "npc" | "giftPreference" | "outfit";
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
  fieldPath?: string;
  status?: "confirmed" | "absent" | "unresolved";
  reasonCode?: string | null;
  collection: keyof Omit<NeighborDatabase, "source"> | "outfits";
  key: string;
  source: NeighborEvidenceSource;
}
