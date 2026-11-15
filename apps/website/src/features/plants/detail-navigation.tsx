import { Link } from "@tanstack/react-router";
import { recordLocation } from "../collection/item-route";
import { useCollectionOrigin } from "../collection/navigation";
import { RecordImage } from "../collection/record-image";
import type { PlantDetailNavigationModel } from "./detail-navigation-model";
import { ScrollFade } from "@/ui/components/scroll-fade";

export function PlantDetailNavigation({
  model,
  currentId,
}: {
  model: PlantDetailNavigationModel;
  currentId: number;
}) {
  const origin = useCollectionOrigin();
  if (model.groups.length === 0 && !model.hasUnconfirmedMembership) return null;
  return (
    <div className="sticky top-0 z-20 min-w-0 space-y-3 border-b bg-background py-2">
      {model.groups.map((group) => (
        <nav key={group.key} aria-label={`${group.label}关联物品`} className="min-w-0 space-y-2">
          {model.groups.length > 1 && (
            <p className="text-xs text-muted-foreground">{group.label}</p>
          )}
          <ScrollFade label={`${group.label}关联物品切换`}>
            <div className="flex w-max min-w-full gap-1 pb-1">
              {group.entries.map((entry) => (
                <Link
                  key={entry.id}
                  {...recordLocation(entry)}
                  state={{ collectionOrigin: origin }}
                  resetScroll={false}
                  aria-current={entry.id === currentId ? "page" : undefined}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
                  onClick={(event) => {
                    if (
                      entry.id === currentId &&
                      event.button === 0 &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey
                    )
                      event.preventDefault();
                  }}
                >
                  <span aria-hidden="true" className="size-8 shrink-0 overflow-hidden rounded-lg">
                    <RecordImage key={entry.image} image={entry.image} name={entry.name} compact />
                  </span>
                  {entry.kind === "series" ? "系列概览" : entry.name}
                </Link>
              ))}
            </div>
          </ScrollFade>
        </nav>
      ))}
      {model.hasUnconfirmedMembership && (
        <p className="text-sm text-muted-foreground">其他系列的成员关系未确认</p>
      )}
    </div>
  );
}
