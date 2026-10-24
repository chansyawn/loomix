import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type FurnitureData = CollectionView["furniture"];

export async function loadFurniture(): Promise<FurnitureData> {
  return (await loadCollectionView()).furniture;
}
