import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseAssets } from "@loomix/schema/assets";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { createResourceReader } from "../infrastructure/resources.ts";
import { createCollectionCatalog } from "./collection/catalog";

async function loadCatalogResources(load: ReturnType<typeof createResourceReader>) {
  const [catalog, assets, gameplayTags] = await Promise.all([
    load("catalog", parseCatalog),
    load("assets", parseAssets),
    load("gameplay-tags", parseGameplayTags),
  ]);
  return { catalog, assets, gameplayTags };
}

export async function loadCollectionCatalog() {
  const { catalog, assets, gameplayTags } = await loadCatalogResources(createResourceReader());
  return createCollectionCatalog(catalog, assets, gameplayTags);
}

export async function loadAllCollectionCatalog(request: typeof fetch = fetch) {
  const load = createResourceReader(request);
  const [{ catalog, assets, gameplayTags }, neighbors] = await Promise.all([
    loadCatalogResources(load),
    load("neighbors", parseNeighbors),
  ]);
  return createCollectionCatalog(
    catalog,
    assets,
    gameplayTags,
    neighbors.giftPreferences.flatMap((preference) => preference.tagIds),
  );
}
export async function loadCollectionView() {
  return (await loadCollectionCatalog()).view;
}
