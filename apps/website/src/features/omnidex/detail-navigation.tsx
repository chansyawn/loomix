import { Link } from "@tanstack/react-router";
import { LayersIcon } from "lucide-react";
import { DetailNavGroup } from "./detail-nav-group";
import { catalogEntryLocation } from "./entry-location";
import { useOmnidexOrigin } from "./navigation";
import { RecordImage } from "./record-image";
import type { DetailNavigationModel } from "./detail-navigation-model";

export function CatalogEntryNavigation({
  model,
  currentId,
}: {
  model: DetailNavigationModel;
  currentId: number;
}) {
  const origin = useOmnidexOrigin();
  if (model.groups.length === 0 && !model.notice) return null;
  const highlightedId = model.highlightedId ?? currentId;
  return (
    <DetailNavGroup
      title="关联物品"
      icon={LayersIcon}
      align="end"
      notice={model.notice}
      lists={model.groups.map((group) => ({
        key: group.key,
        label: model.groups.length > 1 ? group.label : undefined,
        items: group.entries.map((entry) => ({
          key: entry.id,
          label: entry.label ?? entry.name,
          link: (
            <Link
              {...catalogEntryLocation(entry)}
              state={{ omnidexOrigin: origin }}
              resetScroll={false}
              aria-current={
                entry.id === currentId ? "page" : entry.id === highlightedId || undefined
              }
              data-current={entry.id === highlightedId ? "" : undefined}
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
              <span aria-hidden="true" className="size-6 shrink-0 overflow-hidden rounded-md">
                <RecordImage
                  key={entry.image}
                  image={entry.image}
                  name={entry.name}
                  inset="none"
                  background="none"
                  fallback="icon"
                />
              </span>
              <span className="min-w-0">{entry.label ?? entry.name}</span>
            </Link>
          ),
        })),
      }))}
    />
  );
}
