import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseAssets } from "@loomix/schema/assets";
import { createResourceReader } from "../infrastructure/resources.ts";
import { createCollectionCatalog } from "./collection/catalog";

export function loadCollectionCatalog(): Promise<ReturnType<typeof createCollectionCatalog>>;
export function loadCollectionCatalog(
  load: ReturnType<typeof createResourceReader>,
): Promise<ReturnType<typeof createCollectionCatalog>>;
export async function loadCollectionCatalog(load = createResourceReader()) {
  const [catalog, assets, gameplayTags] = await Promise.all([
    load("catalog", parseCatalog),
    load("assets", parseAssets),
    load("gameplay-tags", parseGameplayTags),
  ]);
  return createCollectionCatalog(catalog, assets, gameplayTags);
}
export async function loadCollectionView() {
  return (await loadCollectionCatalog()).view;
}
