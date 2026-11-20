import type { Assets } from "@loomix/schema/assets";
import { imageKey } from "@loomix/schema/assets";
import type { Catalog, ItemAmount } from "@loomix/schema/catalog";
import { isListedItem } from "@loomix/schema/catalog";

export type CreationCardFaceData = {
  background: { file: string; width: number; height: number } | null;
  foreground: string | null;
  quality: number | null;
};

export type CreationCardView = {
  id: number;
  name: string;
  setName: string | null;
  face: CreationCardFaceData;
  materials: ItemAmount[] | null;
};

export type CreationCardReference = { face: CreationCardFaceData; productId: number };

export function indexCreationCards(catalog: Catalog, assets: Assets) {
  const images = new Map(assets.images.map((entry) => [imageKey(entry), entry]));
  const items = new Map(catalog.items.filter(isListedItem).map((item) => [item.id, item]));
  const names = new Map(catalog.creationCardSets.map((set) => [set.id, set.name]));
  const byId = new Map<number, CreationCardReference>();
  const byProduct = new Map<number, CreationCardView[]>();
  for (const card of catalog.items) {
    if (card.kind !== "creationCard") continue;
    const product = items.get(card.recipe.productId);
    const asset = images.get(imageKey(card.front.background));
    const foreground = product?.image ?? card.image;
    const entry: CreationCardView = {
      id: card.id,
      name: card.name,
      setName: card.cardSetId === null ? null : (names.get(card.cardSetId) ?? null),
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
