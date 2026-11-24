import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import type { ClothingRow } from "./data";
import { Link } from "@tanstack/react-router";
import { RecordListCard } from "@/features/omnidex/record-list-card";
import { RecordImage } from "@/features/omnidex/record-image";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";

export function ClothingCard({ record }: { record: ClothingRow }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={record.name}
      quality={record.quality}
      image={<RecordImage key={record.image} image={record.image} name={record.name} />}
      titleLink={
        <Link {...catalogEntryLocation(record)} state={{ omnidexOrigin: origin }}>
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
