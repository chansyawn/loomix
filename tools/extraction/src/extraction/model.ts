import type { Catalog } from "@loomix/schema/catalog";
import type { ClientIconRecords } from "./client-icons/model.ts";
import type { Dataset } from "@loomix/schema/dataset";
import type { ImageRef } from "@loomix/schema/assets";
import type { FieldEvidence } from "./evidence/domain-schema.ts";
import type { ImageNeed, ImageObject } from "./images/model.ts";
import type { NeighborDatabase } from "./source/neighbors/schema.ts";
import type { EvidenceRecord } from "./types.ts";
import type { CollectionEvidence } from "./source/catalog/collection/evidence.ts";
import type { PlantExclusion } from "./source/catalog/plants/read.ts";
import type { NeighborEvidence } from "./source/neighbors/types.ts";
import type { CollectionObservations } from "./schema.ts";
import type { readStarsea } from "./source/starsea/read.ts";
import type { readVignettes } from "./source/vignettes/read.ts";
import type { DyeingObservation } from "./source/hair-dyeing/read.ts";
import type { AcquisitionHints } from "./source/catalog/acquisition-hints.ts";
import type { readPurchaseOffers } from "./source/catalog/purchases/read.ts";

export interface ImageUse {
  use: string;
}
export type WithImageUses<T> = T extends ImageRef
  ? ImageUse
  : T extends object
    ? { [Key in keyof T]: WithImageUses<T[Key]> }
    : T;
export type CatalogObservation = WithImageUses<
  Omit<Catalog, "collections"> & {
    collections: Omit<Catalog["collections"][number], "flowerHybridization">[];
  }
>;

export interface SourceProof extends Omit<FieldEvidence, "entity" | "fieldPath"> {
  owner: "item" | "collection" | "inspoBox" | "tag";
  id: number;
  field: string;
}

export interface ClientReadRecords {
  clientIcons: ClientIconRecords;
  vignettes: ReturnType<typeof readVignettes>;
  hairDyeing: DyeingObservation;
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
  purchaseProofs: FieldEvidence[];
  recordProofs: EvidenceRecord[];
  detailProofs: CollectionEvidence[];
  plantProofs: CollectionEvidence[];
  neighborProofs: NeighborEvidence[];
  diagnostics: {
    purchases: ReturnType<typeof readPurchaseOffers>["diagnostics"];
    collection: CollectionObservations;
    admissions: import("./source/catalog/admissions.ts").RecordEvidence[];
    exclusions: PlantExclusion[];
    investigation: {
      appearances: import("./source/catalog/admissions.ts").AppearanceInvestigation[];
      plants: unknown;
      details: unknown;
      acquisitionHints: AcquisitionHints;
    };
    outsideMembers: unknown;
    cooking: unknown;
    crafting: unknown;
    neighbors: unknown;
  };
}
