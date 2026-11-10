import type { ClothingItem, ClothingSet, ClothingAppearance } from "../collection-view.ts";
import { Link } from "@tanstack/react-router";
import { CollectionCard } from "@/features/collection/collection-card";
import { RecordImage } from "@/features/collection/record-image";
import { useCollectionOrigin } from "@/features/collection/navigation";

export function ClothingCard({
  record,
}: {
  record: ClothingItem | ClothingSet | ClothingAppearance;
}) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={record.name}
      quality={record.quality}
      image={<RecordImage key={record.image} image={record.image} name={record.name} />}
      titleLink={
        <Link
          to="/collections/records/$id"
          params={{ id: String(record.id) }}
          state={{ collectionOrigin: origin }}
        >
          {record.name}
        </Link>
      }
      description={"componentIds" in record ? record.description : null}
      tags={
        "componentIds" in record
          ? record.componentIds === null
            ? null
            : `${record.componentIds.length} 件服装`
          : record.category
      }
    />
  );
}
