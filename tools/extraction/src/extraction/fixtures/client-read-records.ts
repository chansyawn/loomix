import { datasetFixture } from "../../../../../packages/schema/tests/fixture.ts";
import { emptyCatalog } from "../schema.ts";
import type { ClientReadRecords } from "../model.ts";
import { emptyHairDyeing } from "@loomix/schema/hair-dyeing";

export function clientReadRecordsFixture(datasetId = "c".repeat(64)): ClientReadRecords {
  const dataset = datasetFixture();
  return {
    vignettes: { templates: [], candidates: [], proofs: [], rows: [] },
    hairDyeing: {
      data: { ...emptyHairDyeing(), colorGroups: [], colorBlocks: [] },
      proofs: [],
      diagnostics: { hairstyles: [], colorGroups: [] },
    },
    context: { ...dataset.context, datasetId },
    source: dataset.source,
    gameplayTags: dataset.gameplayTags,
    catalog: { items: [], collections: [], inspoBoxes: [] },
    ingredientItemIds: [],
    neighbors: {
      source: dataset.source,
      neighbors: [],
      stars: [],
      stories: [],
      giftPreferences: [],
    },
    starsea: {
      data: { regions: [], islets: [], iconStyles: [] },
      proofs: [],
      diagnostics: {
        regions: [],
        islets: [],
        encounters: [],
        iconStyles: [],
        resourceProfiles: [],
        resourceGroups: [],
      },
    },
    additionalImages: [],
    imageNeeds: [],
    imageObjects: [],
    proofs: [],
    recordProofs: [],
    detailProofs: [],
    plantProofs: [],
    neighborProofs: [],
    diagnostics: {
      collection: {
        ...emptyCatalog(dataset.source),
        items: [],
        seeds: [],
        growths: [],
        details: [],
      },
      admissions: [],
      exclusions: [],
      investigation: {
        appearances: [],
        plants: [],
        details: [],
        acquisitionHints: { displayRows: [], hintRows: [] },
      },
      outsideMembers: [],
      cooking: [],
      crafting: [],
      neighbors: [],
    },
  };
}
