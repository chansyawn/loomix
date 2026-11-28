import type { createImageResolver } from "@loomix/schema/assets";
import type { Catalog, Item } from "@loomix/schema/catalog";

export type CookingRecipeItemView = {
  id: number;
  name: string;
  cookingProductId: number;
  image: string | null;
  cardBackground: string | null;
};

export function cookingItemView(
  item: Item,
  items: ReadonlyMap<number, Item>,
  image: ReturnType<typeof createImageResolver>,
): CookingRecipeItemView | undefined {
  if (item.kind !== "cookingRecipeItem") return;
  return {
    id: item.id,
    name: item.name,
    cookingProductId: item.productId,
    image: image(item.image) ?? image(items.get(item.productId)?.image ?? null),
    cardBackground: image(item.front.background),
  };
}

export function indexCookingItems(catalog: Catalog, image: ReturnType<typeof createImageResolver>) {
  const products = new Map(catalog.items.map((item) => [item.id, item]));
  const byId = new Map<number, CookingRecipeItemView>();
  const byProduct = new Map<number, CookingRecipeItemView[]>();
  for (const item of catalog.items) {
    const card = cookingItemView(item, products, image);
    if (!card) continue;
    byId.set(item.id, card);
    const cards = byProduct.get(card.cookingProductId);
    if (cards) cards.push(card);
    else byProduct.set(card.cookingProductId, [card]);
  }
  return { byId, byProduct };
}
