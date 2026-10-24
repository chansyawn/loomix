import { loadCollectionView } from "../collection-loader.ts";
import type { CollectionView } from "../collection-view.ts";

export type MiscellanyData = CollectionView["miscellaneous"];

export async function loadMiscellany(): Promise<MiscellanyData> {
  return (await loadCollectionView()).miscellaneous;
}
