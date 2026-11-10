import type { Growth, Item, Seed } from "@loomix/schema/catalog";
import type { CollectionRecord, IngredientItem } from "../collection-view";

type ResolvedGrowth<G extends Growth = Growth> = G extends Growth
  ? Omit<G, "stages"> & {
      stages: (Omit<G["stages"][number], "image"> & { image: string | null })[];
    }
  : never;
export type PlantGrowth = ResolvedGrowth;
export type PlantSeed = Omit<
  Seed,
  "image" | "type" | "admissionReasons" | "clientType" | "clientSecondaryType" | "gameplayTagGroups"
> & {
  image: string | null;
  cropSeriesId: number | null;
  plantIds: number[];
  growth: PlantGrowth;
};
type PlantRecord = Extract<Item, { type: "plant" }>;
export interface PlantDrops {
  groups: {
    treeId: number;
    treeName: string;
    entries: (NonNullable<PlantRecord["drops"]>[number] & { item: IngredientItem | null })[];
  }[];
}
export interface PlantGrowthGroup {
  id: number;
  name: string;
  growth: PlantGrowth;
}
export interface PlantSummary {
  categories: string[];
  galaxies: string[];
  acquisition: string[];
  flowerColors: string[];
  harvestCounts: number[];
  seeds: PlantSeed[];
  growths: PlantGrowthGroup[];
  drops: PlantDrops;
}
export type PlantItem = CollectionRecord & {
  cropSeriesId: number | null;
  category: string | null;
  originGalaxy: string | null;
  maturityPeriod: string | null;
  harvestCount: number | null;
  acquisition: string | null;
  flowerColors: PlantRecord["flowerColors"];
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
  seeds: PlantSeed[];
  itemRefs: ReadonlyMap<number, IngredientItem>;
  sourceTreesByItemId: ReadonlyMap<number, PlantItem[]>;
}
