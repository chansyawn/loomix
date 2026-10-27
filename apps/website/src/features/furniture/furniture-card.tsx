import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { useFurnitureOrigin } from "./detail-navigation";
import type { FurnitureItem, FurnitureSet } from "../collection-view.ts";
import { CardContent, CardDescription } from "@/ui/components/card";
import { CollectionCard } from "@/features/collection/collection-card";

export function FurnitureCard({ item }: { item: FurnitureItem }) {
  const origin = useFurnitureOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<FurnitureImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collection/furniture/items/$id"
          params={{ id: String(item.id) }}
          state={{ furnitureOrigin: origin }}
        >
          {item.name}
        </Link>
      }
      description={
        <CardDescription className="min-w-0">
          {item.type && (
            <span className="min-w-0 truncate text-xs" title={item.type}>
              {item.type}
            </span>
          )}
        </CardDescription>
      }
    />
  );
}

export function FurnitureSetCard({ set }: { set: FurnitureSet }) {
  const origin = useFurnitureOrigin();
  return (
    <CollectionCard
      name={set.name}
      quality={set.quality}
      image={<FurnitureImage key={set.image} image={set.image} name={set.name} scene />}
      titleLink={
        <Link
          to="/collection/furniture/sets/$id"
          params={{ id: String(set.id) }}
          state={{ furnitureOrigin: origin }}
        >
          {set.name}
        </Link>
      }
      footer={
        <>
          <LayersIcon className="size-3.5" />
          {set.componentIds === null ? "成员信息未提供" : `${set.componentIds.length} 件家具`}
        </>
      }
    >
      <CardContent>
        <CardDescription className="line-clamp-2 min-h-10">{set.description}</CardDescription>
      </CardContent>
    </CollectionCard>
  );
}
