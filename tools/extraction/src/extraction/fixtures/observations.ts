import { datasetFixture } from "../../../../../packages/schema/tests/fixture.ts";
import { emptyCatalog } from "../schema.ts";
import type { SourceObservations } from "../model.ts";

export function observationFixture(snapshotId = "c".repeat(64)): SourceObservations {
  const dataset = datasetFixture();
  return {
    version: 1,
    context: { ...dataset.context, snapshotId },
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
