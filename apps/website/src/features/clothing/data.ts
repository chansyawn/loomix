import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type ClothingData = CollectionView["clothing"];
export type ClothingRow = ClothingData[keyof ClothingData][number];

export async function loadClothing(): Promise<ClothingData> {
  return (await loadCollectionView()).clothing;
}
