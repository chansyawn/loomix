import { parseCatalogV5, projectLegacyCatalogV5 } from "@loomix/content-schema/v5";
import { resourceUrl } from "../infrastructure/resources.ts";
import { toCollectionView } from "./collection-view.ts";
import type { CollectionView } from "./collection-view.ts";

export async function loadCollectionView(): Promise<CollectionView> {
  const response = await fetch(resourceUrl("content.json"));
  if (!response.ok) throw new Error(`Unable to load collection: ${response.status}`);
  const catalog = parseCatalogV5(await response.json());
  const furnitureRecipes = new Map(
    catalog.items
      .filter((record) => record.category === "furniture" && record.kind === "item")
      .map((record) => [record.id, record.craftingRecipes]),
  );
  return toCollectionView(projectLegacyCatalogV5(catalog), furnitureRecipes);
}
