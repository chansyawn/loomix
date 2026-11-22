import { datasetFixture } from "../../../../../packages/schema/tests/fixture.ts";
import { emptyCatalog } from "../schema.ts";
import { CLIENT_READ_RECORDS_VERSION } from "../model.ts";
import type { ClientReadRecords } from "../model.ts";

export function clientReadRecordsFixture(datasetId = "c".repeat(64)): ClientReadRecords {
  const dataset = datasetFixture();
  return {
    version: CLIENT_READ_RECORDS_VERSION,
    vignettes: { templates: [], candidates: [], proofs: [], rows: [] },
    context: { ...dataset.context, datasetId },
    source: dataset.source,
    gameplayTags: dataset.gameplayTags,
    catalog: { items: [], collections: [], creationCardSets: [] },
    ingredientItemIds: [],
    neighbors: {
      schemaVersion: 4,
      source: dataset.source,
      neighbors: [],
      stars: [],
      stories: [],
      giftPreferences: [],
    },
    starsea: {
      data: { regions: [], islands: [], iconStyles: [] },
      proofs: [],
      diagnostics: {
        regions: [],
        islands: [],
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
        schemaVersion: 2,
        seeds: [],
        growths: [],
        details: [],
      },
      admissions: [],
      exclusions: [],
      investigation: [],
      outsideMembers: [],
      cooking: [],
      crafting: [],
      neighbors: [],
    },
  };
}
