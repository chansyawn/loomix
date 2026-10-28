import type { CatalogV5, CollectionDetail, GrowthSchema } from "@loomix/content-schema/v5";
import type { z } from "zod";
import type { CollectionRecord, IngredientItem } from "../collection-view";

export type PlantGrowth = z.infer<typeof GrowthSchema>;
export type PlantSeed = CatalogV5["cropSeeds"][number];
type PlantRecord = Extract<CatalogV5["items"][number], { category: "plants"; kind: "item" }>;

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

export type PlantItem = CollectionRecord &
  PlantRecord["attributes"] & {
    category: string | null;
    seedId: number | null;
    flowerColors: CollectionDetail["flowerColors"];
    growth: PlantGrowth | null;
    treeDrops: CollectionDetail["treeDrops"];
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
