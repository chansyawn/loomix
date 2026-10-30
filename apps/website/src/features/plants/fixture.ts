import type { PlantItem, PlantSeed, PlantSeries, PlantSummary, PlantsData } from "./model";
import { splitPlantValues } from "./catalog";

export function plantSummaryFixture(fields: Partial<PlantSummary> = {}): PlantSummary {
  return {
    categories: [],
    galaxies: [],
    sources: [],
    flowerColors: [],
    harvestCounts: [],
    seeds: [],
    growths: [],
    drops: { items: [], unlistedCount: 0 },
    ...fields,
  };
}

export function plantItemFixture(fields: Partial<PlantItem> = {}): PlantItem {
  return {
    id: 1,
    name: "植物",
    image: null,
    description: null,
    quality: null,
    category: null,
    originGalaxy: null,
    maturityPeriod: null,
    harvestCount: null,
    sources: null,
    seedId: null,
    flowerColors: null,
    growth: null,
    treeDrops: null,
    ...fields,
    summary:
      fields.summary ??
      plantSummaryFixture({
        categories: fields.category ? [fields.category] : [],
        galaxies: splitPlantValues(fields.originGalaxy ?? null),
        sources: splitPlantValues(fields.sources ?? null),
        flowerColors: fields.flowerColors ?? [],
        harvestCounts:
          fields.harvestCount === null || fields.harvestCount === undefined
            ? []
            : [fields.harvestCount],
      }),
  };
}

export function plantSeriesFixture(fields: Partial<PlantSeries> = {}): PlantSeries {
  return {
    id: 100,
    name: "系列",
    image: null,
    description: null,
    quality: null,
    seriesName: null,
    plantIds: null,
    summary: plantSummaryFixture(),
    ...fields,
  };
}

export function plantSeedFixture(fields: Partial<PlantSeed> = {}): PlantSeed {
  return {
    id: 10,
    name: "种子",
    image: null,
    description: null,
    quality: null,
    productIds: [1],
    growthId: null,
    trade: null,
    acquisition: null,
    detail: {
      description: null,
      quality: null,
      trade: null,
      acquisitionConditions: null,
      growth: null,
      stageIds: null,
      maturityDays: null,
      harvestCount: null,
    },
    ...fields,
  };
}

export function plantsDataFixture(
  fields: Pick<PlantsData, "items" | "series"> & Partial<Pick<PlantsData, "seeds">>,
): PlantsData {
  return {
    ...fields,
    seeds: fields.seeds ?? [],
    itemRefs: new Map(
      fields.items.map((item) => [
        item.id,
        {
          id: item.id,
          name: item.name,
          image: item.image,
          description: item.description,
          quality: item.quality,
          catalogCategory: "plants" as const,
        },
      ]),
    ),
    sourceTreesByItemId: new Map(),
  };
}
