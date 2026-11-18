import { parseDataset } from "@loomix/schema/dataset";
import type { ImageRef } from "@loomix/schema/assets";
import { imageKey } from "@loomix/schema/assets";
import { referencedImages } from "@loomix/schema/dataset/images";
import type { FieldEvidence } from "../evidence/domain-schema.ts";
import { EvidenceSchema } from "../evidence/domain-schema.ts";
import { bindImages } from "../images/bind.ts";
import type { OriginalImage } from "../images/model.ts";
import type { SourceObservations } from "../model.ts";
import { buildNeighbors } from "./neighbors.ts";
import { buildDomainEvidence } from "./evidence.ts";
import { validateDomainEvidence } from "./validate-evidence.ts";
import { assembleCatalog } from "./catalog.ts";
import { plantingDomainEvidence } from "./planting-evidence.ts";
import { starseaItemIds } from "../source/starsea/read.ts";

export function assemble(observations: SourceObservations, originals: readonly OriginalImage[]) {
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
    else if (collection === "neighbors.neighbors") ownerKind = "neighbor";
    else if (collection === "starsea.regions") ownerKind = "starseaRegion";
    else if (collection === "starsea.islands") ownerKind = "starseaIsland";
    else if (collection === "starsea.iconStyles") ownerKind = "starseaIconStyle";
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
            : item.kind === "neighborClothing"
              ? "neighborClothing"
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
  const catalog = assembleCatalog(observations.catalog, image, observations.ingredientItemIds, [
    ...observations.neighbors.giftPreferences.flatMap((entry) => entry.itemIds),
    ...starseaItemIds(observations.starsea.data.islands),
  ]);
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
      islands: observations.starsea.data.islands.map((island) => ({
        ...island,
        illustration: image(
          island.illustration?.use ?? null,
          "starsea.islands",
          island.id,
          "illustration",
        ),
      })),
      iconStyles: observations.starsea.data.iconStyles.map((style) => ({
        ...style,
        icon: image(style.icon?.use ?? null, "starsea.iconStyles", style.id, "icon"),
      })),
    },
  });
  const fields = [
    ...buildDomainEvidence(
      dataset,
      observations.recordProofs,
      observations.detailProofs,
      observations.neighborProofs,
    ),
    ...plantingDomainEvidence(observations.plantProofs, dataset),
    ...observations.starsea.proofs,
    ...observations.proofs.map(({ owner, id, field, ...proof }) => {
      const collection =
        owner === "tag"
          ? "gameplayTags.tags"
          : owner === "collection"
            ? "catalog.collections"
            : "catalog.items";
      let fieldPath = field;
      if (field.startsWith("craftingRecipes.")) {
        const recipeId = Number(field.split(".")[1]);
        const item = dataset.catalog.items.find((item) => item.id === id);
        if (!item || item.kind !== "furniture") throw new Error(`Missing crafting owner ${id}`);
        const index = item.craftingRecipes.findIndex((recipe) => recipe.id === recipeId);
        if (index < 0) throw new Error(`Missing crafting recipe ${recipeId}`);
        fieldPath = `craftingRecipes.${index}`;
      }
      return { ...proof, entity: { collection, id }, fieldPath };
    }),
    ...imageProofs,
  ];
  const evidence = EvidenceSchema.parse({
    ...dataset.context,
    kind: "evidence",
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
    throw new Error("Image jobs do not cover the published reference graph");
  return { dataset, evidence, imageBindings: bound.bindings, imageJobs: jobs };
}
export type Assembly = ReturnType<typeof assemble>;
