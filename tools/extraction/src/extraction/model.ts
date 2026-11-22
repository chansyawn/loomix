import type { Catalog } from "@loomix/schema/catalog";
import type { Dataset } from "@loomix/schema/dataset";
import type { ImageRef } from "@loomix/schema/assets";
import type { FieldEvidence } from "./evidence/domain-schema.ts";
import type { ImageNeed, ImageObject } from "./images/model.ts";
import type { NeighborDatabase } from "./source/neighbors/schema.ts";
import type { EvidenceRecord } from "./types.ts";
import type { CollectionEvidence } from "./source/catalog/collection/evidence.ts";
import type { NeighborEvidence } from "./source/neighbors/types.ts";
import type { CollectionObservations } from "./schema.ts";
import type { readStarsea } from "./source/starsea/read.ts";
import type { readVignettes } from "./source/vignettes/read.ts";

export interface ImageUse {
  use: string;
}
export type WithImageUses<T> = T extends ImageRef
  ? ImageUse
  : T extends readonly (infer Entry)[]
    ? WithImageUses<Entry>[]
    : T extends object
      ? { [Key in keyof T]: WithImageUses<T[Key]> }
      : T;
export type CatalogObservation = WithImageUses<Catalog>;

export interface SourceProof extends Omit<FieldEvidence, "entity" | "fieldPath"> {
  owner: "item" | "collection" | "creationCardSet" | "tag";
  id: number;
  field: string;
}
interface SourceObservationFields {
  context: Dataset["context"];
  source: Dataset["source"];
  gameplayTags: Dataset["gameplayTags"];
  catalog: CatalogObservation;
  ingredientItemIds: number[];
  neighbors: NeighborDatabase;
  starsea: ReturnType<typeof readStarsea>;
  additionalImages: { category: string; neighborId: number; use: string }[];
  imageNeeds: ImageNeed[];
  imageObjects: ImageObject[];
  proofs: SourceProof[];
  recordProofs: EvidenceRecord[];
  detailProofs: CollectionEvidence[];
  plantProofs: CollectionEvidence[];
  neighborProofs: NeighborEvidence[];
  diagnostics: {
    collection: CollectionObservations;
    admissions: import("./source/catalog/admissions.ts").RecordEvidence[];
    exclusions: unknown;
    investigation: unknown;
    outsideMembers: unknown;
    cooking: unknown;
    crafting: unknown;
    neighbors: unknown;
  };
}

export type SourceObservations = SourceObservationFields &
  ({ version: 1 } | { version: 2; vignettes: ReturnType<typeof readVignettes> });
