import type { IngredientItem } from "../collection-view";
import { CollectionItemCard } from "../collection/collection-item-card";
import { collectionItemLocation } from "../collection/item-route";
import { usePlantsOrigin } from "./detail-navigation";
import type { PlantDrops } from "./model";

export function PlantRelatedItems({
  title,
  items,
  unlistedCount = 0,
}: {
  title: string;
  items: IngredientItem[];
  unlistedCount?: number;
}) {
  const origin = usePlantsOrigin();
  if (!items.length && !unlistedCount) return null;
  return (
    <section aria-label={title} className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.id} className="max-w-full min-w-0">
            <CollectionItemCard
              item={item}
              itemId={item.id}
              link={
                item.listed === false
                  ? undefined
                  : {
                      ...collectionItemLocation(item),
                      state: { plantsOrigin: origin },
                    }
              }
            />
          </li>
        ))}
      </ul>
      {unlistedCount > 0 && (
        <p className="text-sm text-muted-foreground">另有 {unlistedCount} 种掉落物尚未收录。</p>
      )}
    </section>
  );
}

export function PlantDropsInfo({ drops }: { drops: PlantDrops }) {
  return (
    <PlantRelatedItems title="产物与掉落" items={drops.items} unlistedCount={drops.unlistedCount} />
  );
}
