import { parseCatalog } from "@loomix/schema/catalog";
import { parseAssets } from "@loomix/schema/assets";
import { createResourceReader } from "../infrastructure/resources.ts";
import { createCollectionCatalog } from "./collection/catalog";

export async function loadCollectionCatalog() {
  const load = createResourceReader();
  const [catalog, assets] = await Promise.all([
    load("catalog", parseCatalog),
    load("assets", parseAssets),
  ]);
  return createCollectionCatalog(catalog, assets);
}
export async function loadCollectionView() {
  return (await loadCollectionCatalog()).view;
}
