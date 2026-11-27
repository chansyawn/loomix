import { z } from "zod";
import { IdSchema } from "../common/identity.ts";

export const ShopIdSchema = z.enum([
  "gelian",
  "luomiTv",
  "neighborWardrobe",
  "starryMarket",
  "giftGallery",
]);
export const ShopSchema = z.strictObject({
  id: ShopIdSchema,
  name: z.string().min(1),
  paymentNote: z.string().trim().min(1).optional(),
});
const amount = z.number().int().nonnegative();
export const PurchasePriceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("fixed"), amount }),
  z.strictObject({
    kind: z.literal("dailyPurchaseCount"),
    entries: z
      .strictObject({ purchasedToday: amount, amount })
      .array()
      .min(1)
      .refine(
        (entries) =>
          entries.every(
            (entry, index) =>
              index === 0 || entries[index - 1]!.purchasedToday < entry.purchasedToday,
          ),
        "Purchase counts must be strictly increasing",
      ),
  }),
]);
export const PurchaseOfferSchema = z.strictObject({
  id: z.string().min(1),
  shopId: ShopIdSchema,
  deliveredItemId: IdSchema,
  currencyItemId: IdSchema,
  price: PurchasePriceSchema,
  note: z.string().trim().min(1).optional(),
});
export type Shop = z.infer<typeof ShopSchema>;
export type PurchaseOffer = z.infer<typeof PurchaseOfferSchema>;
export type PurchasePrice = z.infer<typeof PurchasePriceSchema>;
export type PurchaseCatalog = { shops: Shop[]; purchaseOffers: PurchaseOffer[] };

export function purchaseItemIds({ purchaseOffers }: PurchaseCatalog): Set<number> {
  return new Set(purchaseOffers.flatMap((offer) => [offer.deliveredItemId, offer.currencyItemId]));
}
