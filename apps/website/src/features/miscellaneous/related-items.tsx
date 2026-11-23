import type { IngredientItem } from "../omnidex-view";
import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { catalogEntryLocation } from "../omnidex/entry-location";

export function MiscellaneousSourceTrees({ items }: { items: IngredientItem[] }) {
  return (
    <section aria-label="来源树木" className="space-y-4">
      <h2 className="text-lg font-semibold">来源树木</h2>
      <ul className="flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.id} className="max-w-full min-w-0">
            <CatalogItemCard
              item={item}
              itemId={item.id}
              link={item.browsable === false ? undefined : catalogEntryLocation(item)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
