import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type FurnitureData = CollectionView["furniture"] & {
  ingredientItemsById?: CollectionView["ingredientItemsById"];
};

export async function loadFurniture(): Promise<FurnitureData> {
  const collection = await loadCollectionView();
  return { ...collection.furniture, ingredientItemsById: collection.ingredientItemsById };
}
