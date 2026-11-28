import type { flowerDyeingUses } from "./flower-dyeing";
import { CatalogRelations } from "../omnidex/detail-relations";
import { GameplayRelationItem } from "../omnidex/gameplay-relation-item";
import { catalogEntryLocation } from "../omnidex/entry-location";

export function FlowerDyeingUses({ groups }: { groups: ReturnType<typeof flowerDyeingUses> }) {
  return (
    <ul className="grid gap-4">
      {groups.map((group) => (
        <li key={group.id} className="grid gap-2">
          <h3 className="text-sm font-medium">{group.name}</h3>
          {group.single && <p className="text-sm">单花即可匹配</p>}
          {group.partners.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm">
                可配对的花朵（{group.partners.length}）
              </summary>
              <CatalogRelations items={group.partners} />
            </details>
          )}
          {group.hairstyles.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm">
                适用发型（{group.hairstyles.length}）
              </summary>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {group.hairstyles.map((item) => (
                  <li key={item.id}>
                    <GameplayRelationItem
                      {...item}
                      variant="inline"
                      destination={
                        item.browsable === false
                          ? undefined
                          : { ...catalogEntryLocation(item), hash: "hair-dyeing" }
                      }
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}
