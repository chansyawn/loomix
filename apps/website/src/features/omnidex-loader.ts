import { parseGameplayTags } from "@loomix/schema/gameplay-tags";
import { parseCatalog } from "@loomix/schema/catalog";
import { parseImageIndex } from "@loomix/schema/assets";
import { createResourceReader } from "../infrastructure/resources.ts";
import { createOmnidexCatalog } from "./omnidex/catalog";
import { CATALOG_TAG_FILTER_POLICY } from "./catalog/tag-filter-policy";

async function loadCatalog(
  load: ReturnType<typeof createResourceReader>,
  options?: Parameters<typeof createOmnidexCatalog>[3],
) {
  const [catalog, imageIndex, gameplayTags] = await Promise.all([
    load("catalog", parseCatalog),
    load("image-index", parseImageIndex),
    load("gameplay-tags", parseGameplayTags),
  ]);
  return createOmnidexCatalog(catalog, imageIndex, gameplayTags, options);
}

export function loadOmnidexCatalog(): Promise<ReturnType<typeof createOmnidexCatalog>>;
export function loadOmnidexCatalog(
  load: ReturnType<typeof createResourceReader>,
): Promise<ReturnType<typeof createOmnidexCatalog>>;
export async function loadOmnidexCatalog(load = createResourceReader()) {
  return loadCatalog(load);
}
export async function loadCatalogOverview(load = createResourceReader()) {
  return loadCatalog(load, { tagPolicy: CATALOG_TAG_FILTER_POLICY });
}
export async function loadOmnidexView() {
  return (await loadOmnidexCatalog()).view;
}
