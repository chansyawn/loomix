import { readPlantings } from "../plants/read.ts";
import { plantingImageCandidates } from "../plants/images.ts";
import {
  createCollectionObservationsSchema,
  type CollectionObservations,
} from "../../../schema.ts";
import type { Catalog, CatalogRecord } from "../../../schema.ts";
import type { ContentContext } from "../context.ts";
import { z } from "zod";
import { CollectionEvidenceBuilder } from "./evidence.ts";
import { readCreatureFields } from "./fields.ts";
import { buildItemDetail } from "./details/client.ts";

export const CollectionObservationsSchema = createCollectionObservationsSchema(
  z.string().min(1).nullable(),
);

export function extendCollection(base: Catalog, context: ContentContext) {
  const proofs = new CollectionEvidenceBuilder();
  const plants = readPlantings(context);
  const images = plantingImageCandidates(context, plants);
  const details: CollectionObservations["details"] = [];
  const items = base.items.map((record: CatalogRecord) => {
    details.push(buildItemDetail(context, record, proofs));
    if (record.kind !== "item") return record;
    if (record.category === "clothing") return record;
    if (record.category === "creatures") {
      const { scientificName } = readCreatureFields(context, record.id, proofs);
      return { ...record, attributes: { ...record.attributes, scientificName } };
    }
    return record;
  });
  const catalog: CollectionObservations = CollectionObservationsSchema.parse({
    ...base,
    schemaVersion: 2,
    items,
    seeds: plants.seeds,
    growths: plants.growths,
    details: details.sort((a, b) => a.id - b.id),
  });
  return {
    catalog,
    evidence: proofs.records,
    seedImages: images.seeds,
    stageImages: images.stages,
    plants,
    imageAudit: images.audit,
  };
}
