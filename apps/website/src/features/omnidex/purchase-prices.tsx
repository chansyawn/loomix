import type { ShopPurchaseQuotes } from "./purchase-quotes";
import { RecordImage } from "./record-image";

export function PurchasePrices({ shops }: { shops: readonly ShopPurchaseQuotes[] }) {
  return (
    <dl className="grid gap-2">
      {shops.map(({ id, name, paymentNote, prices }) => (
        <div key={id} className="flex flex-wrap items-start gap-x-2">
          <dt className="py-1 font-medium">{name}</dt>
          <dd className="grid min-w-0">
            {prices.map(({ key, priceLabel, currencyImage, note }) => (
              <div key={key} className="flex items-start gap-1 py-1 tabular-nums">
                {currencyImage && (
                  <RecordImage
                    image={currencyImage}
                    name=""
                    inset="none"
                    background="none"
                    fallback="icon"
                    className="mt-0.5 size-5 shrink-0"
                  />
                )}
                <span>
                  {priceLabel}
                  {note && <span className="text-muted-foreground">（{note}）</span>}
                </span>
              </div>
            ))}
            {paymentNote && <p className="text-muted-foreground">{paymentNote}</p>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
