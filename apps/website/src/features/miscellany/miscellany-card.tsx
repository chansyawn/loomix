import { Link } from "@tanstack/react-router";
import type { MiscellaneousItem } from "../collection-view.ts";
import { CollectionCard } from "@/features/collection/collection-card";
import { RecordImage } from "@/features/collection/record-image";
import { useCollectionOrigin } from "@/features/collection/navigation";

export function MiscellanyCard({ item }: { item: MiscellaneousItem }) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collections/records/$id"
          params={{ id: String(item.id) }}
          state={{ collectionOrigin: origin }}
        >
          {item.name}
        </Link>
      }
    />
  );
}
