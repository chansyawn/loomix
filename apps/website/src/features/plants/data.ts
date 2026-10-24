import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type PlantsData = CollectionView["plants"];

export async function loadPlants(): Promise<PlantsData> {
  return (await loadCollectionView()).plants;
}
