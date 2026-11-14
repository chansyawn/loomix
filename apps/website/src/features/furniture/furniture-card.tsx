import { Link } from "@tanstack/react-router";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { useCollectionOrigin } from "@/features/collection/navigation";
import type { FurnitureItem, FurnitureSet } from "../collection-view.ts";
import { CollectionCard } from "@/features/collection/collection-card";

export function FurnitureCard({ item }: { item: FurnitureItem }) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<FurnitureImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collections/records/$id"
          params={{ id: String(item.id) }}
          state={{ collectionOrigin: origin }}
        >
          {item.name}
        </Link>
      }
      tags={item.furnitureCategory}
    />
  );
}

export function FurnitureSetCard({ set }: { set: FurnitureSet }) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={set.name}
      quality={set.quality}
      image={<FurnitureImage key={set.image} image={set.image} name={set.name} scene />}
      titleLink={
        <Link
          to="/collections/records/$id"
          params={{ id: String(set.id) }}
          state={{ collectionOrigin: origin }}
        >
          {set.name}
        </Link>
      }
      description={set.description}
      tags={set.componentIds === null ? null : `${set.componentIds.length} 件家具`}
    />
  );
}
