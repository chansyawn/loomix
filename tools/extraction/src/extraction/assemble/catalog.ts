import type { Catalog, InspoBox, Item } from "@loomix/schema/catalog";
import { purchaseItemIds } from "@loomix/schema/catalog";
import type { ImageRef } from "@loomix/schema/assets";
import type { CatalogObservation } from "../model.ts";

export function assembleCatalog(
  observed: CatalogObservation,
  image: (use: string | null, collection: string, id: number, field: string) => ImageRef | null,
  ingredientIds: readonly number[],
  referencedItemIds: readonly number[],
): Catalog {
  const items: Item[] = observed.items.map((item): Item => {
    if (item.kind === "reference" && !item.image) return { ...item, image: null };
    if (item.kind === "inspoCard" || item.kind === "cookingRecipeItem") {
      const background = image(
        item.front.background.use,
        "catalog.items",
        item.id,
        "front.background",
      );
      if (background?.variant !== "card-background")
        throw new Error(`Missing ${item.kind} background ${item.id}`);
      return {
        ...item,
        front: { background: { ...background, variant: background.variant } },
        image: image(item.image?.use ?? null, "catalog.items", item.id, "image"),
      };
    }
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
    flowerHybridization: null,
  }));
  const inspoBoxes = observed.inspoBoxes.map((entry): InspoBox => {
    const art = image(entry.image?.use ?? null, "catalog.inspoBoxes", entry.id, "image");
    if (art !== null && art.variant !== "illustration")
      throw new Error(`Invalid creation card set image ${entry.id}`);
    return { ...entry, image: art && { assetId: art.assetId, variant: "illustration" } };
  });
  const formal = new Set(
    [...items.filter((item) => item.kind !== "reference"), ...collections].map((entry) => entry.id),
  );
  const references = new Set([
    ...ingredientIds,
    ...referencedItemIds,
    ...purchaseItemIds(observed),
  ]);
  for (const item of items) {
    if (item.kind === "inspoCard")
      for (const material of item.recipe.materials ?? []) references.add(material.itemId);
    if (item.kind === "plant") for (const drop of item.drops ?? []) references.add(drop.itemId);
    if (item.kind === "neighborOutfit" && item.playerItemId !== null)
      references.add(item.playerItemId);
  }
  const available = new Map(items.map((item) => [item.id, item]));
  for (const id of references)
    if (!available.has(id) && !formal.has(id)) throw new Error(`Missing reference identity ${id}`);
  return {
    shops: observed.shops,
    purchaseOffers: observed.purchaseOffers,
    items: items
      .filter(
        (item) => item.kind !== "reference" || (references.has(item.id) && !formal.has(item.id)),
      )
      .sort((a, b) => a.id - b.id),
    collections: collections.sort((a, b) => a.id - b.id),
    inspoBoxes: inspoBoxes.sort((a, b) => a.id - b.id),
  };
}
