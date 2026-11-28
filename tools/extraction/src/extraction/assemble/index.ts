import type { ImageRef } from "@loomix/schema/assets";
import { assembleClientIcons } from "../client-icons/model.ts";
import { assembleNeighborImages } from "../neighbor-images/model.ts";
import { imageKey } from "@loomix/schema/assets";
import { referencedImages } from "@loomix/schema/dataset/images";
import { parseDataset } from "@loomix/schema/dataset";
import type { FieldEvidence } from "../evidence/domain-schema.ts";
import { FieldEvidenceReportSchema } from "../evidence/domain-schema.ts";
import { bindImages } from "../images/bind.ts";
import type { OriginalImage } from "../images/model.ts";
import type { ClientReadRecords } from "../model.ts";
import { buildNeighbors } from "./neighbors.ts";
import { neighborReferencedItemIds } from "../source/neighbors/references.ts";
import { buildDomainEvidence } from "./evidence.ts";
import { validateDomainEvidence } from "./validate-evidence.ts";
import { assembleCatalog } from "./catalog.ts";
import { plantingDomainEvidence } from "./planting-evidence.ts";
import { starseaItemIds } from "../source/starsea/read.ts";
import { assembleFlowerHybridization } from "../external/flower-hybridization.ts";
import type { FrozenFlowerHybridization } from "../external/flower-hybridization.ts";
import { dyeMaterialIds } from "../source/hair-dyeing/read.ts";

export function assemble(
  observations: ClientReadRecords,
  originals: readonly OriginalImage[],
  flowerHybridization: FrozenFlowerHybridization,
) {
  const bound = bindImages(observations.imageNeeds, originals);
  const needs = new Map(observations.imageNeeds.map((need) => [need.id, need]));
  const objects = new Map(observations.imageObjects.map((object) => [object.key, object]));
  const imageProofs: FieldEvidence[] = [];
  const image = (
    use: string | null,
    collection: string,
    id: number,
    fieldPath: string,
  ): ImageRef | null => {
    if (use === null)
      throw new Error(`Image use must be explicit ${collection}:${id}:${fieldPath}`);
    const result = bound.image(use);
    const need = needs.get(use)!;
    let ownerId = id;
    let ownerKind: typeof need.owner.kind;
    if (collection === "catalog.collections") ownerKind = "collection";
    else if (collection === "catalog.inspoBoxes") ownerKind = "inspoBox";
    else if (collection === "neighbors.neighbors") ownerKind = "neighbor";
    else if (collection === "starsea.regions") ownerKind = "starseaRegion";
    else if (collection === "starsea.islets") ownerKind = "starseaIslet";
    else if (collection === "starsea.iconStyles") ownerKind = "starseaIconStyle";
    else if (collection === "vignettes.templates") ownerKind = "vignette";
    else if (collection === "hairDyeing.colorGroups") ownerKind = "hairColorGroup";
    else if (collection === "hairDyeing.colorBlocks") ownerKind = "hairColorBlock";
    else {
      const item = observations.catalog.items.find((item) => item.id === id);
      if (!item) throw new Error(`Missing image owner ${id}`);
      if (fieldPath.startsWith("growth.stages.") && item.kind === "seed") {
        const stage = item.growth.stages[Number(fieldPath.split(".")[2])];
        if (!stage) throw new Error(`Missing stage image owner ${id}.${fieldPath}`);
        ownerKind = "stage";
        ownerId = stage.id;
      } else
        ownerKind =
          item.kind === "seed"
            ? "seed"
            : item.kind === "neighborOutfit"
              ? "neighborOutfit"
              : "item";
    }
    if (need.owner.id !== ownerId || need.owner.kind !== ownerKind)
      throw new Error(`Image use belongs to a different owner ${use} → ${collection}:${id}`);
    const object = result ? objects.get(result.assetId) : null;
    if (result && !object) throw new Error(`Missing image object ${result.assetId}`);
    imageProofs.push({
      entity: { collection, id },
      fieldPath,
      status: result ? "confirmed" : "unresolved",
      sources: [
        ...need.sources,
        ...(object ? [{ kind: "asset" as const, file: object.source, pathId: object.pathId }] : []),
      ],
      ruleId: "client.images.exact_reference_then_area_rank_object",
      reasonCode: result ? null : need.reason,
    });
    return result;
  };
  const clientCatalog = assembleCatalog(
    observations.catalog,
    image,
    observations.ingredientItemIds,
    [
      ...neighborReferencedItemIds(observations.neighbors),
      ...starseaItemIds(observations.starsea.data.islets),
      ...dyeMaterialIds(observations.hairDyeing.data),
    ],
  );
  const { catalog, fields: flowerProofs } = assembleFlowerHybridization(
    clientCatalog,
    flowerHybridization,
  );
  const neighbors = buildNeighbors(
    observations.neighbors,
    (use, id, fieldPath) => image(use, "neighbors.neighbors", id, fieldPath),
    observations.additionalImages.map((entry) => {
      const result = image(
        entry.use,
        "neighbors.neighbors",
        entry.neighborId,
        `images.${entry.category}`,
      );
      if (!result) throw new Error(`Missing additional neighbor image ${entry.use}`);
      return { category: entry.category, neighborId: entry.neighborId, image: result };
    }),
  );
  const catalogIds = new Set(catalog.items.map(({ id }) => id));
  const vignettes = {
    templates: observations.vignettes.templates.map((template) => ({
      ...template,
      illustration: image(
        template.illustration.use,
        "vignettes.templates",
        template.id,
        "illustration",
      ),
    })),
    fallbackItems: observations.vignettes.candidates.filter(({ id }) => !catalogIds.has(id)),
  };
  const dataset = parseDataset({
    context: observations.context,
    source: observations.source,
    gameplayTags: observations.gameplayTags,
    catalog,
    neighbors,
    starsea: {
      regions: observations.starsea.data.regions.map((region) => ({
        ...region,
        stationImage: image(
          region.stationImage?.use ?? null,
          "starsea.regions",
          region.id,
          "stationImage",
        ),
        mapImage: region.mapImage
          ? image(region.mapImage.use, "starsea.regions", region.id, "mapImage")
          : null,
      })),
      islets: observations.starsea.data.islets.map((islet) => ({
        ...islet,
        illustration: image(
          islet.illustration?.use ?? null,
          "starsea.islets",
          islet.id,
          "illustration",
        ),
      })),
      iconStyles: observations.starsea.data.iconStyles.map((style) => ({
        ...style,
        icon: image(style.icon?.use ?? null, "starsea.iconStyles", style.id, "icon"),
      })),
    },
    vignettes,
    hairDyeing: {
      ...observations.hairDyeing.data,
      colorGroups: observations.hairDyeing.data.colorGroups.map((entry) => ({
        ...entry,
        icon: image(entry.icon?.use ?? null, "hairDyeing.colorGroups", entry.id, "icon"),
      })),
      colorBlocks: observations.hairDyeing.data.colorBlocks.map((entry) => ({
        ...entry,
        icon: image(entry.icon?.use ?? null, "hairDyeing.colorBlocks", entry.id, "icon"),
      })),
    },
  });
  const fields = [
    ...observations.purchaseProofs,
    ...flowerProofs,
    ...buildDomainEvidence(
      dataset,
      observations.recordProofs,
      observations.detailProofs,
      observations.neighborProofs,
    ),
    ...plantingDomainEvidence(observations.plantProofs, dataset),
    ...observations.starsea.proofs,
    ...observations.hairDyeing.proofs,
    ...observations.vignettes.proofs.filter(
      (proof) =>
        proof.entity.collection !== "vignettes.fallbackItems" ||
        !catalogIds.has(Number(proof.entity.id)),
    ),
    ...observations.proofs.map(({ owner, id, field, ...proof }) => {
      const collection =
        owner === "tag"
          ? "gameplayTags.tags"
          : owner === "collection"
            ? "catalog.collections"
            : owner === "inspoBox"
              ? "catalog.inspoBoxes"
              : "catalog.items";
      return { ...proof, entity: { collection, id }, fieldPath: field };
    }),
    ...imageProofs,
  ];
  const fieldEvidence = FieldEvidenceReportSchema.parse({
    ...dataset.context,
    kind: "field-evidence",
    fields: validateDomainEvidence(dataset, fields).map((proof) => ({
      ...proof,
      sources: proof.sources.map((source) =>
        source.kind === "asset" ? source : { ...source, file: `source/${source.file}` },
      ),
    })),
  });
  const used = new Set(referencedImages(dataset).map(imageKey));
  const jobs = bound.jobs.filter((job) => used.has(imageKey(job)));
  if (jobs.length !== used.size)
    throw new Error("Image jobs do not cover the dataset reference graph");
  return {
    dataset,
    fieldEvidence,
    imageBindings: bound.bindings,
    imageJobs: jobs,
    neighborImages: assembleNeighborImages(
      dataset.context.datasetId,
      observations.neighborImages,
      originals,
    ),
    clientIcons: assembleClientIcons(
      dataset.context.datasetId,
      observations.clientIcons,
      originals,
    ),
  };
}
export type Assembly = ReturnType<typeof assemble>;
