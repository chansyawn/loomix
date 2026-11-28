import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { InspoCardFace } from "../omnidex/inspo-card-face";
import { catalogEntryLocation } from "../omnidex/entry-location";
import type { PlantDrop, PlantDrops } from "./model";

export function PlantDropsInfo({ drops }: { drops: PlantDrops }) {
  if (!drops.groups.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {drops.groups.map((group) => (
        <div key={group.treeId} className="flex flex-col gap-4">
          {drops.groups.length > 1 && <h3 className="text-sm font-medium">{group.treeName}</h3>}
          {[
            {
              title: "果实产物",
              entries: group.entries.filter((entry) => entry.source === "fruit"),
            },
            {
              title: "砍树掉落",
              entries: group.entries.filter((entry) => entry.source === "felling"),
            },
          ].map(
            ({ title, entries }) =>
              entries.length > 0 && (
                <div key={title} className="flex flex-col gap-3">
                  <h4 className="text-sm text-muted-foreground">{title}</h4>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
                    {entries.map((entry) => (
                      <li key={`${entry.source}:${entry.itemId}`} className="max-w-full min-w-0">
                        <PlantDropCard drop={entry} />
                      </li>
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      ))}
    </div>
  );
}

function PlantDropCard({ drop: { item, itemId, inspoCard } }: { drop: PlantDrop }) {
  const target = inspoCard?.product ?? (item?.browsable !== false ? item : null);
  return (
    <CatalogItemCard
      item={item}
      itemId={itemId}
      link={target ? catalogEntryLocation(target) : undefined}
      thumbnail={
        inspoCard ? (
          <div
            aria-hidden="true"
            className="flex size-full items-center justify-center bg-muted p-2"
          >
            <InspoCardFace
              {...inspoCard.face}
              productName={inspoCard.product.name}
              className="h-full w-auto"
            />
          </div>
        ) : undefined
      }
    />
  );
}
