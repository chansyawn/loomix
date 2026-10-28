import type { Growth, Item, Seed } from "@loomix/schema/catalog";
import type { CollectionRecord, IngredientItem } from "../collection-view";

export type PlantGrowth = Omit<Growth, "id" | "stages"> & {
  stages: { id: number; name: string | null; image: string | null }[] | null;
};
export type PlantSeed = Omit<Seed, "image"> & {
  image: string | null;
  detail: {
    description: string | null;
    quality: number | null;
    trade: Seed["trade"];
    acquisitionConditions: Seed["acquisition"];
    growth: PlantGrowth | null;
    stageIds: number[] | null;
    maturityDays: number | null;
    harvestCount: number | null;
  };
};
type PlantRecord = Extract<Item, { type: "plant" }>;
export interface PlantDrops {
  items: IngredientItem[];
  unlistedCount: number;
}
export interface PlantGrowthGroup {
  id: number;
  name: string;
  growth: PlantGrowth;
}
export interface PlantSummary {
  categories: string[];
  galaxies: string[];
  sources: string[];
  flowerColors: string[];
  harvestCounts: number[];
  seeds: PlantSeed[];
  growths: PlantGrowthGroup[];
  drops: PlantDrops;
}
export type PlantItem = CollectionRecord & {
  category: string | null;
  originGalaxy: string | null;
  maturityPeriod: string | null;
  harvestCount: number | null;
  sources: string | null;
  seedId: number | null;
  flowerColors: PlantRecord["flowerColors"];
  growth: PlantGrowth | null;
  treeDrops: PlantRecord["drops"];
  summary: PlantSummary;
};
export type PlantSeries = CollectionRecord & {
  seriesName: string | null;
  plantIds: number[] | null;
  summary: PlantSummary;
};
export interface PlantsData {
  items: PlantItem[];
  series: PlantSeries[];
  itemRefs: ReadonlyMap<number, IngredientItem>;
  sourceTreesByItemId: ReadonlyMap<number, PlantItem[]>;
}
