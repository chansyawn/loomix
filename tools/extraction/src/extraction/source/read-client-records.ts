import path from "node:path";
import { createContentContext } from "./catalog/context.ts";
import { readContent } from "./catalog/content.ts";
import { extendCollection } from "./catalog/collection/observe.ts";
import { detailInvestigation } from "./catalog/collection/details/investigation.ts";
import { readAcquisitionHints } from "./catalog/acquisition-hints.ts";
import { extractNeighborBundle } from "./neighbors/extract.ts";
import { collectNeighborOutfitImage } from "./neighbors/outfit-image.ts";
import {
  selectAdditionalNeighborImages,
  parseAdditionalNeighborImageSelections,
} from "./neighbors/additional-images.ts";
import { readJson } from "../../workflow/json.ts";
import { catalogSource, profile } from "../../profile.ts";
import type { IndexedAsset } from "../types.ts";
import type { EvidenceSource } from "../evidence/domain-schema.ts";
import type { ClientReadRecords } from "../model.ts";
import { imageCollector } from "./images.ts";
import { readCatalog } from "./catalog/read.ts";
import { readCraftingRecipes } from "./catalog/crafting/read.ts";
import { isPlaceholderIcon } from "./catalog/crafting/cards.ts";
import { FORMAT_VERSION } from "@loomix/schema/common";
import { readStarsea, starseaItemIds } from "./starsea/read.ts";
import { readVignetteHints } from "./vignettes/hints.ts";
import { readVignetteDiscovery } from "./vignettes/inputs.ts";
import { readVignettes } from "./vignettes/read.ts";
import { dyeMaterialIds, readHairDyeing } from "./hair-dyeing/read.ts";
export interface FrozenPackage {
  source: string;
  sha256: string;
}

export function readClientRecords(source: string, datasetId: string): ClientReadRecords {
  const context = createContentContext(source);
  const index = readJson<IndexedAsset[]>(path.join(source, "prepared/asset-index.json"));
  const packages = readJson<FrozenPackage[]>(path.join(source, "packages.json"));
  const images = imageCollector(
    index,
    new Map(packages.map((entry) => [entry.source, entry.sha256])),
  );
  const displaySources = (id: number): EvidenceSource[] => {
    const row = context.tables.rows(325).find((row) => context.tables.id(row) === id);
    return row
      ? [
          {
            kind: "table",
            file: "prepared/ed.obb",
            table: 325,
            rowOffset: row.rowOffset,
            fields: [0, 4, 5],
          },
        ]
      : [{ kind: "tableScan", file: "prepared/ed.obb", table: 325 }];
  };
  const iconReferences = (id: number) =>
    [5, 4].flatMap((field) => {
      const value = context.tables.string(
        context.tables.rows(325).find((row) => context.tables.id(row) === id),
        field,
      );
      return value ? [value] : [];
    });
  const content = readContent(context);
  const crafting = readCraftingRecipes(
    context,
    new Set(
      content.content.items
        .filter((record) => record.category === "furniture" && record.kind === "item")
        .map((record) => record.id),
    ),
  );
  const craftingProductIds = new Set(crafting.recipes.map(({ productId }) => productId));
  for (const record of content.content.items) {
    const usable = (reference: string) =>
      !craftingProductIds.has(record.id) || !isPlaceholderIcon(reference);
    record.image = images.need(
      {
        kind: record.kind === "set" || record.kind === "series" ? "collection" : "item",
        id: record.id,
        field: "image",
      },
      content.candidateImages.filter((image) => image.id === record.id && usable(image.reference)),
      record.category === "furniture" && record.kind === "set" ? "banner" : "icon",
      displaySources(record.id),
      record.kind === "series"
        ? "series_picture_purpose_unconfirmed"
        : "image_not_configured_or_matched",
      false,
      record.kind === "series" ? [] : iconReferences(record.id).filter(usable),
    );
  }
  const collection = extendCollection(content.content, context);
  for (const seed of collection.catalog.seeds)
    seed.image = images.need(
      { kind: "seed", id: seed.id, field: "image" },
      collection.seedImages.filter((image) => image.id === seed.id),
      "icon",
      displaySources(seed.id),
      "seed_image_not_configured_or_matched",
      false,
      iconReferences(seed.id),
    );
  const stageUses = new Map<number, string>();
  for (const growth of collection.catalog.growths)
    for (const stage of growth.stages) {
      let use = stageUses.get(stage.id);
      if (!use) {
        use = images.need(
          { kind: "stage", id: stage.id, field: "image" },
          collection.stageImages.filter((image) => image.id === stage.id),
          "icon",
          displaySources(stage.id),
          "stage_image_not_configured_or_matched",
          false,
          iconReferences(stage.id),
        );
        stageUses.set(stage.id, use);
      }
      stage.image = use;
    }
  const neighbors = extractNeighborBundle({
    tables: context.tables,
    source: { ...catalogSource, manifestId: profile.manifestId },
    tagIndex: context.gameplayTags.index,
  });
  const neighborSources = (id: number): EvidenceSource[] =>
    neighbors.audit.records
      .filter((entry) => entry.collection === "neighbors" && Number(entry.key) === id)
      .map((entry) => entry.source);
  for (const star of neighbors.database.stars)
    star.illustrationPath = images.configured(
      { kind: "neighbor", id: star.npcId, field: `stars.${star.key}.image` },
      star.illustrationPath,
      "illustration",
      neighborSources(star.npcId),
    );
  for (const neighbor of neighbors.database.neighbors)
    for (const stage of neighbor.house?.stages ?? [])
      stage.image = images.configured(
        { kind: "neighbor", id: neighbor.id, field: `house.stages.${stage.id}.image` },
        stage.image,
        "illustration",
        neighborSources(neighbor.id),
      );
  for (const story of neighbors.database.stories)
    for (const [index, paragraph] of story.paragraphs.entries())
      paragraph.illustrationPath = images.configured(
        {
          kind: "neighbor",
          id: story.npcId,
          field: `stories.${story.chapter}.paragraphs.${index}.image`,
        },
        paragraph.illustrationPath,
        "illustration",
        neighborSources(story.npcId),
      );
  const outfitImages = new Map(
    neighbors.clothing.map(({ id }) => [
      id,
      collectNeighborOutfitImage(images, id, iconReferences(id), displaySources(id)),
    ]),
  );
  const additionalImages = selectAdditionalNeighborImages(
    index.filter((a) => a.Type === "Texture2D"),
    index.filter((a) => a.Type === "Sprite"),
    parseAdditionalNeighborImageSelections(readJson(path.join(source, "additional-images.json"))),
  ).map((image) => ({
    category: image.category,
    neighborId: image.npcId,
    use: images.need(
      { kind: "neighbor", id: image.npcId, field: `images.${image.category}` },
      [image],
      "illustration",
      [{ kind: "asset", file: image.source, pathId: image.pathId }],
      "additional_neighbor_image_missing",
      true,
    ),
  }));
  const starsea = readStarsea(
    context.tables,
    new Set(neighbors.database.neighbors.map((neighbor) => neighbor.id)),
    images,
  );
  const hairDyeing = readHairDyeing(
    source,
    context.tables,
    index,
    images,
    new Set(
      collection.catalog.items
        .filter((record) => record.kind === "appearance" && record.subcategory === "发型")
        .map(({ id }) => id),
    ),
    new Set(
      collection.catalog.items
        .filter(
          (record) =>
            record.kind === "item" && record.category === "plants" && record.subcategory === "花",
        )
        .map(({ id }) => id),
    ),
  );
  const catalog = readCatalog({
    observations: collection.catalog,
    context,
    crafting,
    images,
    referencedItemIds: [
      ...neighbors.database.giftPreferences.flatMap((entry) => entry.itemIds),
      ...starseaItemIds(starsea.data.islets),
      ...dyeMaterialIds(hairDyeing.data),
    ],
    neighborOutfits: neighbors.clothing,
    outfitSourcesById: neighbors.clothingSources,
    neighborImage: (reference, id) => {
      const use = outfitImages.get(id);
      if (!use) throw new Error(`Missing outfit image use ${reference}`);
      return { use };
    },
  });
  const seedKinds = collection.catalog.seeds.map((seed) => ({
    owner: "item" as const,
    id: seed.id,
    field: "kind",
    status: "confirmed" as const,
    sources: collection.plants.evidence
      .filter((proof) => proof.id === seed.id && proof.field === "growthId")
      .flatMap((proof) =>
        proof.sources.map(({ file, table, rowOffset, fields }) => ({
          kind: "table" as const,
          file,
          table,
          rowOffset,
          fields,
        })),
      ),
    ruleId: "client.catalog.deterministic_seed",
    reasonCode: null,
  }));
  const tagProofs = context.gameplayTags.tags.map((tag) => ({
    owner: "tag" as const,
    id: tag.id,
    field: "$",
    status: "confirmed" as const,
    sources: context.gameplayTags.sources(tag.id),
    ruleId: "client.gameplayTags",
    reasonCode: null,
  }));
  return {
    hairDyeing,
    vignettes: readVignettes(
      context.tables,
      context.gameplayTags.index,
      readVignetteDiscovery(source, index),
      readVignetteHints(source),
      images,
    ),
    context: { formatVersion: FORMAT_VERSION, datasetId, locale: "zh-CN" },
    source: { ...catalogSource, manifestId: profile.manifestId },
    gameplayTags: { tags: context.gameplayTags.tags.map(({ enumName: _enumName, ...tag }) => tag) },
    catalog: catalog.catalog,
    ingredientItemIds: [
      ...new Set(context.ingredientCategoryBuild.associations.map((entry) => entry.itemId)),
    ].sort((a, b) => a - b),
    neighbors: neighbors.database,
    starsea,
    additionalImages,
    imageNeeds: images.needs,
    imageObjects: images.objects,
    proofs: [...catalog.proofs, ...content.cookingEvidence, ...seedKinds, ...tagProofs],
    recordProofs: content.proofs.filter((proof) => proof.field !== "image"),
    detailProofs: collection.evidence,
    plantProofs: collection.plants.evidence,
    neighborProofs: neighbors.audit.records,
    diagnostics: {
      collection: collection.catalog,
      admissions: context.scope.admissionEvidence,
      exclusions: collection.plants.exclusions,
      investigation: {
        appearances: context.scope.appearances.investigation,
        plants: collection.plants.investigation,
        details: detailInvestigation(context),
        acquisitionHints: readAcquisitionHints(context.tables),
      },
      outsideMembers: context.scope.outsideMembers,
      cooking: content.cookingAudit,
      crafting: catalog.crafting,
      neighbors: neighbors.audit,
    },
  };
}
