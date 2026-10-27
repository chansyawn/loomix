import { parseCatalogV4, projectLegacyCatalog } from "@loomix/content-schema/v4";
import { resourceUrl } from "../infrastructure/resources.ts";
import { toCollectionView } from "./collection-view.ts";
import type { CollectionView } from "./collection-view.ts";

export async function loadCollectionView(): Promise<CollectionView> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load collection: ${response.status}`);
  const catalog = parseCatalogV4(await response.json());
  return toCollectionView(projectLegacyCatalog(catalog));
}
