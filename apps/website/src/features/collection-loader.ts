import { parseCatalog } from "@loomix/content-schema";
import { resourceUrl } from "../infrastructure/resources.ts";
import { toCollectionView } from "./collection-view.ts";
import type { CollectionView } from "./collection-view.ts";

export async function loadCollectionView(): Promise<CollectionView> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load collection: ${response.status}`);
  return toCollectionView(parseCatalog(await response.json()));
}
