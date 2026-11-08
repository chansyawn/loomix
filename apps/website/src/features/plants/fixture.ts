import type { PlantItem, PlantSeed, PlantSeries, PlantSummary, PlantsData } from "./model";
import { splitPlantValues } from "./catalog";

export function plantSummaryFixture(fields: Partial<PlantSummary> = {}): PlantSummary {
  return {
    categories: [],
    galaxies: [],
    acquisition: [],
    flowerColors: [],
    harvestCounts: [],
    seeds: [],
    growths: [],
    drops: { groups: [] },
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
    cropSeriesId: null,
    originGalaxy: null,
    maturityPeriod: null,
    harvestCount: null,
    acquisition: null,
    flowerColors: null,
    treeDrops: null,
    ...fields,
    summary:
      fields.summary ??
      plantSummaryFixture({
        categories: fields.category ? [fields.category] : [],
        galaxies: splitPlantValues(fields.originGalaxy ?? null),
        acquisition: splitPlantValues(fields.acquisition ?? null),
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
  const id = fields.id ?? 10;
  const plantIds = fields.plantIds ?? [1];
  return {
    id,
    name: "种子",
    image: null,
    description: null,
    quality: null,
    plantIds,
    cropSeriesId: null,
    growthId: id,
    trade: null,
    acquisition: null,
    growth: {
      id,
      kind: "staged",
      maturityDays: null,
      stages: plantIds.map((plantId) => ({
        id: plantId + 1000,
        name: "植株",
        image: null,
        plantId,
      })),
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
          cropSeriesId: item.cropSeriesId,
        },
      ]),
    ),
    sourceTreesByItemId: new Map(),
  };
}
