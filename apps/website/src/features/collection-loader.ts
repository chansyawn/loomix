import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseAssets } from "@loomix/schema/assets";
import { createResourceReader } from "../infrastructure/resources.ts";
import { createCollectionCatalog } from "./collection/catalog";
import { ALL_TAG_FILTER_POLICY } from "./all/tag-filter-policy";

async function loadCatalog(
  load: ReturnType<typeof createResourceReader>,
  options?: Parameters<typeof createCollectionCatalog>[3],
) {
  const [catalog, assets, gameplayTags] = await Promise.all([
    load("catalog", parseCatalog),
    load("assets", parseAssets),
    load("gameplay-tags", parseGameplayTags),
  ]);
  return createCollectionCatalog(catalog, assets, gameplayTags, options);
}

export function loadCollectionCatalog(): Promise<ReturnType<typeof createCollectionCatalog>>;
export function loadCollectionCatalog(
  load: ReturnType<typeof createResourceReader>,
): Promise<ReturnType<typeof createCollectionCatalog>>;
export async function loadCollectionCatalog(load = createResourceReader()) {
  return loadCatalog(load);
}
export async function loadAllCollectionCatalog(load = createResourceReader()) {
  return loadCatalog(load, { tagPolicy: ALL_TAG_FILTER_POLICY });
}
export async function loadCollectionView() {
  return (await loadCollectionCatalog()).view;
}
