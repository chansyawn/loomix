import { readPlantings } from "../plants/read.ts";
import { plantingImageCandidates } from "../plants/images.ts";
import path from "node:path";
import { createCollectionObservationsSchema, type CollectionObservations } from "../schema.ts";
import type { Catalog, CatalogRecord } from "../schema.ts";
import type { ContentContext } from "../content/context.ts";
import { createContentContext } from "../content/context.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { parseRawContent, RawImageSchema } from "../schemas/raw-content.ts";
import { CollectionEvidenceBuilder } from "./evidence.ts";
import { readCreatureFields, readDishFields } from "./fields.ts";
import { buildItemDetail } from "./details/client.ts";
import { detailInvestigation } from "./details/investigation.ts";

export const RawCollectionObservationsSchema = createCollectionObservationsSchema(RawImageSchema);

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
    if (record.category === "dishes") {
      const { tastes, difficultyRequirement } = readDishFields(context, record.id, proofs);
      return {
        ...record,
        attributes: { ...record.attributes, tastes },
        difficultyRequirement,
      };
    }
    return record;
  });
  const catalog: CollectionObservations = RawCollectionObservationsSchema.parse({
    ...base,
    schemaVersion: 1,
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

export function buildCollection(work: string): void {
  const base = parseRawContent(readJson(path.join(work, "raw/images-content.json")));
  const result = extendCollection(base, createContentContext(work));
  writeJson(path.join(work, "raw/catalog-observations.json"), result.catalog);
  writeJson(path.join(work, "collection-evidence.json"), result.evidence);
  writeJson(path.join(work, "plant-evidence.json"), result.plants.evidence);
  writeJson(path.join(work, "plant-image-audit.json"), result.imageAudit);
  writeJson(path.join(work, "plant-exclusions.json"), result.plants.exclusions);
  writeJson(path.join(work, "plant-investigation.json"), result.plants.investigation);
  writeJson(
    path.join(work, "collection-missing-fields.json"),
    result.evidence.filter((proof) => proof.value === null),
  );
  writeJson(
    path.join(work, "collection-investigation.json"),
    detailInvestigation(createContentContext(work)),
  );
  writeJson(path.join(work, "seed-image-candidates.json"), result.seedImages);
  writeJson(path.join(work, "stage-image-candidates.json"), result.stageImages);
}
