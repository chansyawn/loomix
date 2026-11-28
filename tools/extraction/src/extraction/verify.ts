import assert from "node:assert/strict";
import path from "node:path";
import { readCandidate, readVerifiedExtraction } from "./bundle.ts";
import { readClientRecords } from "./source/read-client-records.ts";
import { readVignetteDiscovery } from "./source/vignettes/inputs.ts";
import { Tables, indexTables } from "./source/decode/tables.ts";
import { decodeTextMap } from "./source/decode/textmap.ts";
import { ObbReader } from "./source/decode/obb.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { verifyCatalogSources } from "../verify/catalog.ts";
import { verifyPurchaseOffers } from "../verify/purchases.ts";
import { verifyCraftingRelations } from "../verify/crafting.ts";
import { verifyCookingRecipes } from "../verify/cooking.ts";
import { verifyClientIconSources } from "../verify/client-icons.ts";
import { verifyCollectionFields } from "../verify/collection-fields.ts";
import { verifyProofSources } from "../verify/collection.ts";
import { verifyPlantings } from "../verify/plants.ts";
import { verifyImages } from "../verify/images.ts";
import { verifyEvidence } from "../verify/evidence.ts";
import { verifyNeighborDetails } from "./source/neighbors/verify-details.ts";
import { verifyHouseUpgrades } from "../verify/house-upgrades.ts";
import { verifyNeighborImages } from "../verify/neighbor-images.ts";
import { verifyStarseaSources } from "../verify/starsea.ts";
import { verifyVignettes } from "../verify/vignettes.ts";
import { verifyFlowerHybridization } from "../verify/flower-hybridization.ts";
import { verifyHairDyeing } from "../verify/hair-dyeing.ts";
import { readDyeingInputs } from "./source/hair-dyeing/inputs.ts";
import { verifyAcquisitionHints } from "../verify/acquisition-hints.ts";
import type { IndexedAsset } from "./types.ts";

export async function verifyCandidate(directory: string, writeReport = true): Promise<void> {
  const bundle = readCandidate(directory);
  const {
    dataset,
    clientReadRecords: observations,
    originals,
    imageBindings,
    fieldEvidence,
  } = bundle;
  const source = path.join(directory, "source");
  const reader = new ObbReader(path.join(source, "prepared/ed.obb"));
  assert.deepEqual(
    readJson(path.join(source, "prepared/obb-table-index.json")),
    indexTables(reader),
    "Frozen table index decodes from OBB",
  );
  const textmap = readJson<{ byHash: unknown }>(path.join(source, "prepared/textmap-zh-en.json"));
  assert.deepEqual(textmap.byHash, decodeTextMap(reader).byHash, "Frozen TextMap decodes from OBB");
  const tables = new Tables(path.join(source, "prepared"));
  const index = readJson<IndexedAsset[]>(path.join(source, "prepared/asset-index.json"));
  const discovery = readVignetteDiscovery(source, index);
  verifyPurchaseOffers(
    dataset.catalog,
    fieldEvidence.fields,
    tables,
    observations.diagnostics.purchases,
    dataset.source.dataRevision,
    discovery,
  );
  verifyAcquisitionHints(observations.diagnostics.investigation.acquisitionHints, tables);
  verifyStarseaSources(dataset, observations.starsea.diagnostics, tables);
  verifyVignettes(
    tables,
    discovery,
    dataset.vignettes,
    observations.vignettes,
    imageBindings,
    originals,
  );
  const hairstyleIds = verifyCatalogSources(
    dataset,
    observations,
    tables,
    source,
    fieldEvidence.fields,
  );
  verifyHairDyeing(
    dataset,
    tables,
    readDyeingInputs(source, index),
    hairstyleIds,
    observations.hairDyeing.diagnostics,
    fieldEvidence.fields,
  );
  verifyFlowerHybridization(dataset.catalog, fieldEvidence.fields, bundle.flowerHybridization);
  verifyCollectionFields(observations.diagnostics.collection, tables);
  for (const proof of observations.detailProofs) verifyProofSources(proof, tables);
  verifyPlantings(observations.diagnostics.collection, source);
  for (const seed of observations.diagnostics.collection.seeds) {
    const item = dataset.catalog.items.find((item) => item.id === seed.id);
    assert.ok(item && item.kind === "seed");
    const growth = observations.diagnostics.collection.growths.find(
      (growth) => growth.id === seed.growthId,
    )!;
    assert.deepEqual(
      item.growth.stages.map(({ image: _image, ...stage }) => stage),
      growth.stages.map(({ image: _image, ...stage }) => stage),
      "Published planting stage relationships",
    );
    assert.equal(item.growth.kind, growth.kind, "Published growth kind");
    if (item.growth.kind === "crop" && growth.kind === "crop") {
      assert.deepEqual(
        {
          initialStageIds: item.growth.initialStageIds,
          regrowthStageIds: item.growth.regrowthStageIds,
          matureStages: item.growth.matureStages,
          witheredStageId: item.growth.witheredStageId,
          harvestCount: item.growth.harvestCount,
        },
        {
          initialStageIds: growth.initialStageIds,
          regrowthStageIds: growth.regrowthStageIds ?? [],
          matureStages: growth.matureStages,
          witheredStageId: growth.witheredStageId,
          harvestCount: growth.harvestCount,
        },
        "Independent published crop configuration",
      );
    }
  }
  verifyNeighborDetails(observations.neighbors, tables);
  verifyHouseUpgrades(tables, observations.neighbors, dataset.neighbors, fieldEvidence.fields);
  verifyNeighborImages(
    observations.neighborImages,
    observations.neighbors,
    tables,
    index,
    observations.imageObjects,
  );
  verifyCookingRecipes(dataset.catalog, tables);
  verifyClientIconSources(observations.clientIcons, dataset.catalog, tables);
  verifyCraftingRelations(dataset.catalog, tables, observations.diagnostics.crafting);
  verifyImages(directory, tables, observations, originals, imageBindings);
  verifyEvidence(directory, dataset, fieldEvidence, tables);
  // 可重现性与独立来源断言分开；此比较不能代替上面的来源验收。
  assert.deepEqual(
    observations,
    readClientRecords(source, dataset.context.datasetId),
    "Reproducible client read records",
  );
  if (writeReport)
    writeJson(path.join(directory, "validation.json"), {
      passed: true,
      independentSources: true,
      reproducible: true,
      datasetId: dataset.context.datasetId,
    });
}

export async function verifyExtraction(directory: string, expectedId?: string) {
  const bundle = await readVerifiedExtraction(directory, expectedId);
  await verifyCandidate(directory, false);
  return bundle;
}
