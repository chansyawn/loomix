import path from "node:path";
import {
  createCollectionObservationsSchema,
  type CollectionObservations,
} from "@loomix/schema/extraction";
import type { Catalog, CatalogRecord } from "@loomix/schema/extraction";
import type { ContentContext } from "../content/context.ts";
import { createContentContext } from "../content/context.ts";
import type { SelectedImage } from "../types.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { parseRawContent, RawImageSchema } from "../schemas/raw-content.ts";
import { readCraftingRecipes } from "./crafting.ts";
import { CollectionEvidenceBuilder, localizedSources, tableSource } from "./evidence.ts";
import { readCreatureFields, readDishFields, readSources } from "./fields.ts";
import { buildItemDetail, buildSeedDetail } from "./details/client.ts";
import { detailInvestigation } from "./details/investigation.ts";

export const RawCollectionObservationsSchema = createCollectionObservationsSchema(RawImageSchema);

function cropSeeds(context: ContentContext, proofs: CollectionEvidenceBuilder) {
  const { tables, scope } = context;
  const seeds: CollectionObservations["cropSeeds"] = [];
  const images: SelectedImage[] = [];
  const stageImages: SelectedImage[] = [];
  const stageIds = new Set<number>();
  for (const row of tables.rows(144)) {
    const id = tables.id(row);
    const productIds = (tables.vector(row, 10) ?? [])
      .filter((product) => scope.groups.get(product) === "plants.item")
      .sort((a, b) => a - b);
    if (!productIds.length) continue;
    const name = tables.text(context.main.get(id), 1);
    if (!name) throw new Error(`Unresolved crop seed name ${id}`);
    const detail = buildSeedDetail(context, row, proofs);
    for (const stage of detail.growth?.stages ?? []) stageIds.add(stage.id);
    seeds.push({ id, name, productIds, image: null, detail });
    proofs.put(
      "seed",
      id,
      "name",
      name,
      localizedSources(tables, context.main.get(id), [0, 1]),
      "144.0 seed = 318.0",
      "Resolve 318.1 TextMap; seed is a reference, not a catalog admission",
    );
    proofs.put(
      "seed",
      id,
      "productIds",
      productIds,
      [tableSource(tables, row, [0, 10])],
      "144.10 contains current plants.item IDs",
      "Keep formal products; sort ascending; no stage/day inference",
    );
    const ui = context.ui.get(id) ?? tables.rows(325).find((entry) => tables.uint(entry, 0) === id);
    for (const field of [5, 4]) {
      const reference = tables.string(ui, field);
      const match = reference ? context.resolveIcon(reference) : null;
      if (match?.matched && match.source && match.resourceName && match.container && match.pathId)
        images.push({
          id,
          group: "plants.item",
          reference: reference!,
          assetType: match.assetType,
          resourceName: match.resourceName,
          container: match.container,
          source: match.source,
          pathId: match.pathId,
        });
    }
    if (!images.some((image) => image.id === id)) throw new Error(`Missing crop seed icon ${id}`);
  }
  for (const id of stageIds) {
    const ui = tables.rows(325).find((entry) => tables.id(entry) === id);
    for (const field of [5, 4]) {
      const reference = tables.string(ui, field);
      const match = reference ? context.resolveIcon(reference) : null;
      if (match?.matched && match.source && match.resourceName && match.container && match.pathId)
        stageImages.push({
          id,
          group: "plants.item",
          reference: reference!,
          assetType: match.assetType,
          resourceName: match.resourceName,
          container: match.container,
          source: match.source,
          pathId: match.pathId,
        });
    }
    if (!stageImages.some((image) => image.id === id))
      throw new Error(`Missing crop stage icon ${id}`);
  }
  return { seeds: seeds.sort((a, b) => a.id - b.id), images, stageImages };
}

export function extendCollection(base: Catalog, context: ContentContext) {
  const proofs = new CollectionEvidenceBuilder();
  const crafting = readCraftingRecipes(context.tables, base);
  const crops = cropSeeds(context, proofs);
  const products = new Map(
    crops.seeds.flatMap((seed) => seed.productIds.map((id) => [id, seed.id] as const)),
  );
  const details: CollectionObservations["details"] = [];
  const items = base.items.map((record: CatalogRecord) => {
    details.push(buildItemDetail(context, record, proofs));
    if (record.kind !== "item") return record;
    if (record.category === "furniture") {
      const entry = crafting.byProduct.get(record.id);
      const craftingRecipes = entry?.recipes ?? null;
      proofs.put(
        "item",
        record.id,
        "craftingRecipes",
        craftingRecipes,
        entry?.sources ?? [],
        "568.1=furniture item ID",
        "568.12/14/16/18 material IDs paired with 13/15/17/19 positive quantities; preserve slot order",
        "no_crafting_recipe_row",
      );
      return { ...record, craftingRecipes };
    }
    if (record.category === "clothing") return record;
    const sources = readSources(context, record.id, proofs);
    if (record.category === "creatures") {
      const { scientificName, research } = readCreatureFields(context, record.id, proofs);
      return { ...record, attributes: { ...record.attributes, sources, scientificName }, research };
    }
    if (record.category === "dishes") {
      const { tastes, difficultyRequirement } = readDishFields(context, record.id, proofs);
      return {
        ...record,
        attributes: { ...record.attributes, sources, tastes },
        difficultyRequirement,
      };
    }
    if (record.category === "plants") {
      const seedId = products.get(record.id) ?? null;
      const crop = context.vocabulary.cropsByProduct.get(record.id);
      proofs.put(
        "item",
        record.id,
        "seedId",
        seedId,
        crop ? [tableSource(context.tables, crop, [0, 10])] : [],
        "144.10 product vector contains plant ID",
        "Preserve 144.0 seed ID; no new catalog item",
        "not_in_crop_product_vector",
      );
      return { ...record, attributes: { ...record.attributes, sources }, seedId };
    }
    return { ...record, attributes: { ...record.attributes, sources } };
  });
  const catalog: CollectionObservations = RawCollectionObservationsSchema.parse({
    ...base,
    schemaVersion: 1,
    items,
    cropSeeds: crops.seeds,
    details: details.sort((a, b) => a.id - b.id),
  });
  return {
    catalog,
    evidence: proofs.records,
    seedImages: crops.images,
    stageImages: crops.stageImages,
    craftingAudit: crafting.audit,
  };
}

export function buildCollection(work: string): void {
  const base = parseRawContent(readJson(path.join(work, "raw/images-content.json")));
  const result = extendCollection(base, createContentContext(work));
  writeJson(path.join(work, "raw/catalog-observations.json"), result.catalog);
  writeJson(path.join(work, "collection-evidence.json"), result.evidence);
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
  writeJson(path.join(work, "crafting-audit.json"), result.craftingAudit);
}
