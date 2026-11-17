import type { Catalog, Item } from "@loomix/schema/catalog";
import type { ImageRef } from "@loomix/schema/assets";
import type { CatalogObservation } from "../model.ts";

export function assembleCatalog(
  observed: CatalogObservation,
  image: (use: string | null, collection: string, id: number, field: string) => ImageRef | null,
  ingredientIds: readonly number[],
  giftItemIds: readonly number[],
): Catalog {
  const items: Item[] = observed.items.map((item): Item => {
    if (item.kind === "reference") return item;
    if (item.kind !== "seed")
      return { ...item, image: image(item.image?.use ?? null, "catalog.items", item.id, "image") };
    return {
      ...item,
      image: image(item.image?.use ?? null, "catalog.items", item.id, "image"),
      growth: {
        ...item.growth,
        stages: item.growth.stages.map((stage, index) => ({
          ...stage,
          image: image(
            stage.image?.use ?? null,
            "catalog.items",
            item.id,
            `growth.stages.${index}.image`,
          ),
        })),
      },
    };
  });
  const collections = observed.collections.map((entry) => ({
    ...entry,
    image: image(entry.image?.use ?? null, "catalog.collections", entry.id, "image"),
  }));
  const formal = new Set(
    [...items.filter((item) => item.kind !== "reference"), ...collections].map((entry) => entry.id),
  );
  const references = new Set([...ingredientIds, ...giftItemIds]);
  for (const item of items) {
    if (item.kind === "furniture")
      for (const recipe of item.craftingRecipes)
        for (const material of recipe.materials ?? []) references.add(material.itemId);
    if (item.kind === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
    if (item.kind === "neighborClothing" && item.playerItemId !== null)
      references.add(item.playerItemId);
  }
  const available = new Map(items.map((item) => [item.id, item]));
  for (const id of references)
    if (!available.has(id) && !formal.has(id)) throw new Error(`Missing reference identity ${id}`);
  return {
    items: items
      .filter(
        (item) => item.kind !== "reference" || (references.has(item.id) && !formal.has(item.id)),
      )
      .sort((a, b) => a.id - b.id),
    collections: collections.sort((a, b) => a.id - b.id),
  };
}
