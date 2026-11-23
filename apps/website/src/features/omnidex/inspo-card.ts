import type { ImageIndex } from "@loomix/schema/assets";
import { imageKey } from "@loomix/schema/assets";
import type { Catalog, ItemAmount } from "@loomix/schema/catalog";
import { isListedItem } from "@loomix/schema/catalog";

export type InspoCardFaceData = {
  background: { file: string; width: number; height: number } | null;
  foreground: string | null;
  quality: number | null;
};

export type InspoCardView = {
  id: number;
  name: string;
  inspoBoxName: string | null;
  face: InspoCardFaceData;
  materials: ItemAmount[] | null;
};

export type InspoCardReference = { face: InspoCardFaceData; productId: number };

export function indexInspoCards(catalog: Catalog, imageIndex: ImageIndex) {
  const images = new Map(imageIndex.images.map((entry) => [imageKey(entry), entry]));
  const items = new Map(catalog.items.filter(isListedItem).map((item) => [item.id, item]));
  const names = new Map(catalog.inspoBoxes.map((box) => [box.id, box.name]));
  const byId = new Map<number, InspoCardReference>();
  const byProduct = new Map<number, InspoCardView[]>();
  for (const card of catalog.items) {
    if (card.kind !== "inspoCard") continue;
    const product = items.get(card.recipe.productId);
    const asset = images.get(imageKey(card.front.background));
    const foreground = product?.image ?? card.image;
    const entry: InspoCardView = {
      id: card.id,
      name: card.name,
      inspoBoxName: card.inspoBoxId === null ? null : (names.get(card.inspoBoxId) ?? null),
      materials: card.recipe.materials,
      face: {
        background: asset ? { file: asset.file, width: asset.width, height: asset.height } : null,
        foreground: foreground ? (images.get(imageKey(foreground))?.file ?? null) : null,
        quality: card.quality,
      },
    };
    const { productId } = card.recipe;
    byId.set(card.id, { face: entry.face, productId });
    const cards = byProduct.get(productId);
    if (cards) cards.push(entry);
    else byProduct.set(productId, [entry]);
  }
  for (const cards of byProduct.values()) cards.sort((left, right) => left.id - right.id);
  return { byId, byProduct };
}
