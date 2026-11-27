import type { Catalog, PurchaseOffer, PurchasePrice } from "@loomix/schema/catalog";

export interface PurchaseQuote {
  id: string;
  shopId: PurchaseOffer["shopId"];
  shopName: string;
  priceLabel: string;
  shortfall: string | null;
}

function formatPrice(price: PurchasePrice, currency: string): string {
  if (price.kind === "fixed") return `${price.amount} ${currency}`;
  return price.entries
    .map(({ purchasedToday, amount }) => `当日第 ${purchasedToday + 1} 次 ${amount} ${currency}`)
    .join("，");
}

function quoteKey({ shopId, deliveredItemId, currencyItemId, price }: PurchaseOffer): string {
  const amounts =
    price.kind === "fixed"
      ? price.amount
      : price.entries.map(({ purchasedToday, amount }) => [purchasedToday, amount]);
  return JSON.stringify([shopId, deliveredItemId, currencyItemId, amounts]);
}

export function indexPurchaseQuotes(catalog: Catalog): Map<number, PurchaseQuote[]> {
  const names = new Map(catalog.items.map((item) => [item.id, item.name]));
  const shops = new Map(catalog.shops.map((shop) => [shop.id, shop]));
  const byItem = new Map<number, PurchaseQuote[]>();
  const seen = new Set<string>();
  for (const offer of catalog.purchaseOffers) {
    const key = quoteKey(offer);
    if (seen.has(key)) continue;
    seen.add(key);
    const shop = shops.get(offer.shopId)!;
    const currency = names.get(offer.currencyItemId)!;
    const rule = shop.shortfallPayment;
    const quote: PurchaseQuote = {
      id: offer.id,
      shopId: shop.id,
      shopName: shop.name,
      priceLabel: formatPrice(offer.price, currency),
      shortfall:
        rule?.primaryCurrencyItemId === offer.currencyItemId
          ? `${currency}不足时，可用等额${names.get(rule.substituteCurrencyItemId)!}补足。`
          : null,
    };
    const quotes = byItem.get(offer.deliveredItemId);
    if (quotes) quotes.push(quote);
    else byItem.set(offer.deliveredItemId, [quote]);
  }
  return byItem;
}

export function purchasePriceSummary(quotes: readonly PurchaseQuote[] | undefined): string | null {
  if (!quotes?.length) return null;
  const multipleShops = quotes.some((quote) => quote.shopId !== quotes[0].shopId);
  return quotes
    .map(({ shopName, priceLabel }) => (multipleShops ? `${shopName} ${priceLabel}` : priceLabel))
    .join(" / ");
}
