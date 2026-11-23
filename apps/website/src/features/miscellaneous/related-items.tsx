import type { IngredientItem } from "../omnidex-view";
import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { ExpandableGrid } from "../omnidex/expandable-grid";
import { catalogEntryLocation } from "../omnidex/entry-location";
import type { FurnitureMaterialUse } from "../omnidex-view";

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

function FurnitureUseCard({ usage }: { usage: FurnitureMaterialUse }) {
  const { furniture, recipes } = usage;
  const sameQuantity = new Set(recipes.map((recipe) => recipe.quantity)).size === 1;
  return (
    <CatalogItemCard
      item={furniture}
      itemId={furniture.id}
      quantity={sameQuantity ? recipes[0]?.quantity : undefined}
      description={
        sameQuantity
          ? undefined
          : recipes.map((recipe) => `配方 ${recipe.position}：× ${recipe.quantity}`).join("\n")
      }
      fullDescription
      link={catalogEntryLocation(furniture)}
    />
  );
}

export function MiscellaneousFurnitureUses({ uses }: { uses: FurnitureMaterialUse[] }) {
  return (
    <section aria-label="家具用途" className="space-y-4">
      <h2 className="text-lg font-semibold">家具用途</h2>
      <ExpandableGrid
        items={uses}
        getKey={(usage) => usage.furniture.id}
        renderItem={(usage) => <FurnitureUseCard usage={usage} />}
        label="家具"
        unit="件"
      />
    </section>
  );
}
