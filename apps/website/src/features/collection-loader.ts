import { parseCatalog } from "@loomix/schema/catalog";
import { parseAssets } from "@loomix/schema/assets";
import { createResourceReader } from "../infrastructure/resources.ts";
import { toCollectionView } from "./collection-view.ts";
import type { CollectionView } from "./collection-view.ts";

export async function loadCollectionView(): Promise<CollectionView> {
  const load = createResourceReader();
  const [catalog, assets] = await Promise.all([
    load("catalog", parseCatalog),
    load("assets", parseAssets),
  ]);
  return toCollectionView(catalog, assets);
}
