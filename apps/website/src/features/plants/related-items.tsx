import type { IngredientItem } from "../collection-view";
import { CollectionItemLink } from "../collection/item-link";
import { RecordImage } from "../collection/record-image";
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
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-2">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <CollectionItemLink
              item={item}
              state={{ plantsOrigin: origin }}
              className="flex items-center gap-3 rounded-xl border p-2 text-sm underline-offset-4 hover:bg-muted/50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true" className="w-12 shrink-0 overflow-hidden rounded-lg">
                <RecordImage image={item.image} name={item.name} compact />
              </span>
              <span className="min-w-0 wrap-anywhere">{item.name}</span>
            </CollectionItemLink>
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
