import type { IngredientItem } from "../collection-view";
import { CollectionItemCard } from "../collection/collection-item-card";
import { CollectionExpandableGrid } from "../collection/expandable-grid";
import { collectionItemLocation } from "../collection/item-route";
import type { MiscellanyFurnitureUse } from "./detail";

export function MiscellanySourceTrees({ items }: { items: IngredientItem[] }) {
  return (
    <section aria-label="来源树木" className="space-y-4">
      <h2 className="text-lg font-semibold">来源树木</h2>
      <ul className="flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.id} className="max-w-full min-w-0">
            <CollectionItemCard
              item={item}
              itemId={item.id}
              link={item.listed === false ? undefined : collectionItemLocation(item)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FurnitureUseCard({ usage }: { usage: MiscellanyFurnitureUse }) {
  const { furniture, recipes } = usage;
  const sameQuantity = new Set(recipes.map((recipe) => recipe.quantity)).size === 1;
  return (
    <CollectionItemCard
      item={furniture}
      itemId={furniture.id}
      quantity={sameQuantity ? recipes[0]?.quantity : undefined}
      description={
        sameQuantity
          ? undefined
          : recipes.map((recipe) => `配方 ${recipe.position}：× ${recipe.quantity}`).join("\n")
      }
      fullDescription
      link={{ to: "/collection/furniture/items/$id", params: { id: String(furniture.id) } }}
    />
  );
}

export function MiscellanyFurnitureUses({ uses }: { uses: MiscellanyFurnitureUse[] }) {
  return (
    <section aria-label="家具用途" className="space-y-4">
      <h2 className="text-lg font-semibold">家具用途</h2>
      <CollectionExpandableGrid
        items={uses}
        getKey={(usage) => usage.furniture.id}
        renderItem={(usage) => <FurnitureUseCard usage={usage} />}
        label="家具"
        unit="件"
      />
    </section>
  );
}
