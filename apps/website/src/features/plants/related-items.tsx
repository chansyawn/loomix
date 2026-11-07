import type { IngredientItem } from "../collection-view";
import { CollectionItemCard } from "../collection/collection-item-card";
import { collectionItemLocation } from "../collection/item-route";
import { usePlantsOrigin } from "./detail-navigation";
import type { PlantDrops } from "./model";
import { dropProbability } from "./drop-probability";

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
  const origin = usePlantsOrigin();
  if (!drops.groups.length) return null;
  return (
    <section aria-label="产物与掉落" className="space-y-4">
      <h2 className="text-lg font-semibold">产物与掉落</h2>
      {drops.groups.map((group) => (
        <div key={group.treeId} className="space-y-4">
          {drops.groups.length > 1 && <h3 className="text-sm font-medium">{group.treeName}</h3>}
          {[
            {
              title: "果实产物",
              entries: group.entries.filter((entry) => entry.dropGroupId === null),
            },
            {
              title: "砍树掉落",
              entries: group.entries.filter((entry) => entry.dropGroupId !== null),
            },
          ].map(
            ({ title, entries }) =>
              entries.length > 0 && (
                <div key={title} className="space-y-3">
                  <h4 className="text-sm text-muted-foreground">{title}</h4>
                  <ul className="flex flex-wrap gap-3">
                    {entries.map((entry) => (
                      <li
                        key={String(entry.dropGroupId) + ":" + entry.itemId}
                        className="max-w-full min-w-0"
                      >
                        <CollectionItemCard
                          item={entry.item}
                          itemId={entry.itemId}
                          description={
                            entry.dropGroupId === null
                              ? undefined
                              : "掉落概率 " + dropProbability(entry.probability)
                          }
                          link={
                            entry.item && entry.item.listed !== false
                              ? {
                                  ...collectionItemLocation(entry.item),
                                  state: { plantsOrigin: origin },
                                }
                              : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      ))}
    </section>
  );
}
