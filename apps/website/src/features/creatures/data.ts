import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type CreaturesData = CollectionView["creatures"];

export async function loadCreatures(): Promise<CreaturesData> {
  return (await loadCollectionView()).creatures;
}
