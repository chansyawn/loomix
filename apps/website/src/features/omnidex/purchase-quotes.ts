import type { createImageResolver } from "@loomix/schema/assets";
import type { Catalog, PurchaseOffer, PurchasePrice, Shop } from "@loomix/schema/catalog";

interface PurchaseQuote {
  key: string;
  priceLabel: string;
  currencyImage: string | null;
  note: string | null;
}

export interface ShopPurchaseQuotes extends Shop {
  prices: PurchaseQuote[];
}

function formatPrice(price: PurchasePrice, currency: string): string {
  if (price.kind === "fixed") return `${price.amount} ${currency}`;
  return price.entries
    .map(({ purchasedToday, amount }) => `当日第 ${purchasedToday + 1} 次 ${amount} ${currency}`)
    .join("，");
}

function priceKey({ currencyItemId, price }: PurchaseOffer): string {
  const amounts =
    price.kind === "fixed"
      ? price.amount
      : price.entries.map(({ purchasedToday, amount }) => [purchasedToday, amount]);
  return JSON.stringify([currencyItemId, amounts]);
}

function groupOffers<Key>(offers: PurchaseOffer[], keyOf: (offer: PurchaseOffer) => Key) {
  const groups = new Map<Key, PurchaseOffer[]>();
  for (const offer of offers) {
    const key = keyOf(offer);
    const group = groups.get(key);
    if (group) group.push(offer);
    else groups.set(key, [offer]);
  }
  return groups;
}

export function indexPurchaseQuotes(
  catalog: Catalog,
  image: ReturnType<typeof createImageResolver>,
) {
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const shops = new Map(catalog.shops.map((shop) => [shop.id, shop]));
  const byItem = new Map<number, ShopPurchaseQuotes[]>();
  for (const [itemId, offers] of groupOffers(
    catalog.purchaseOffers,
    (offer) => offer.deliveredItemId,
  )) {
    const groups: ShopPurchaseQuotes[] = [];
    for (const [shopId, shopOffers] of groupOffers(offers, (offer) => offer.shopId)) {
      const prices = Array.from(groupOffers(shopOffers, priceKey), ([key, sources]) => {
        const { currencyItemId, price, note } = sources[0];
        const currency = items.get(currencyItemId)!;
        return {
          key,
          priceLabel: formatPrice(price, currency.name),
          currencyImage: image(currency.image),
          note: note && sources.every((source) => source.note === note) ? note : null,
        };
      });
      groups.push({ ...shops.get(shopId)!, prices });
    }
    byItem.set(itemId, groups);
  }
  return byItem;
}

export function purchasePriceSummary(
  shops: readonly ShopPurchaseQuotes[] | undefined,
): string | null {
  if (!shops?.length) return null;
  return shops
    .flatMap(({ name, prices }) =>
      prices.map(({ priceLabel }) => (shops.length > 1 ? `${name} ${priceLabel}` : priceLabel)),
    )
    .join(" / ");
}
