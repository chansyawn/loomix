import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type DishesData = CollectionView["dishes"];

export async function loadDishes(): Promise<DishesData> {
  return (await loadCollectionView()).dishes;
}
