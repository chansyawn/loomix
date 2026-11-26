import type { Collection, FlowerHybridizationRecipe, Growth, ItemOf } from "@loomix/schema/catalog";
import type { CatalogEntrySummary, IngredientItem } from "../omnidex-view";
import type { InspoCardFaceData } from "../omnidex/inspo-card";

type ResolvedGrowth<G extends Growth = Growth> = G extends Growth
  ? Omit<G, "stages"> & {
      stages: (Omit<G["stages"][number], "image"> & { image: string | null })[];
    }
  : never;
export type PlantGrowth = ResolvedGrowth;
export type PlantSeed = Omit<ItemOf<"seed">, "image" | "kind" | "tagIds" | "growth"> & {
  image: string | null;
  plantIds: number[];
  growth: PlantGrowth;
};
type PlantRecord = ItemOf<"plant">;
export type PlantDrop = NonNullable<PlantRecord["drops"]>[number] & {
  item: IngredientItem | null;
  inspoCard: { face: InspoCardFaceData; product: Pick<IngredientItem, "id" | "name"> } | null;
};
export interface PlantDrops {
  groups: {
    treeId: number;
    treeName: string;
    entries: PlantDrop[];
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
  flowerColors: string[];
  harvestCounts: number[];
  seeds: PlantSeed[];
  growths: PlantGrowthGroup[];
  drops: PlantDrops;
}
export type PlantItem = CatalogEntrySummary & {
  category: string | null;
  originGalaxy: string | null;
  harvestCount: number | null;
  flowerColors: PlantRecord["flowerColors"];
  treeDrops: PlantRecord["drops"];
  summary: PlantSummary;
};
export type PlantSeries = CatalogEntrySummary & {
  seriesName: string | null;
  plantIds: number[] | null;
  flowerHybridization: Collection["flowerHybridization"];
  summary: PlantSummary;
};
export type FlowerHybridizationSeries = {
  id: number;
  name: string;
  members: Pick<PlantItem, "id" | "name" | "image">[];
  recipes: FlowerHybridizationRecipe[];
};
export interface PlantsData {
  items: PlantItem[];
  series: PlantSeries[];
  seeds: PlantSeed[];
  itemRefs: ReadonlyMap<number, IngredientItem>;
  sourceTreesByItemId: ReadonlyMap<number, PlantItem[]>;
}

export function seedSeries(seed: PlantSeed, groups: PlantSeries[]): PlantSeries[] {
  const plantIds = new Set(seed.plantIds);
  return groups.filter((group) => group.plantIds?.some((id) => plantIds.has(id)));
}
