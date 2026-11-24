import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import { RecordImage as FurnitureImage } from "@/features/omnidex/record-image";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import type { FurnitureItem, FurnitureSet } from "../omnidex-view.ts";
import { RecordListCard } from "@/features/omnidex/record-list-card";

export function FurnitureCard({ item }: { item: FurnitureItem }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={item.name}
      quality={item.quality}
      image={<FurnitureImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link {...catalogEntryLocation(item)} state={{ omnidexOrigin: origin }}>
          {item.name}
        </Link>
      }
      tags={item.furnitureCategory}
    />
  );
}

export function FurnitureSetCard({ set }: { set: FurnitureSet }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={set.name}
      quality={set.quality}
      image={
        <FurnitureImage
          key={set.image}
          image={set.image}
          name={set.name}
          fit="cover"
          inset="none"
          className="aspect-2/1"
        />
      }
      titleLink={
        <Link {...catalogEntryLocation(set)} state={{ omnidexOrigin: origin }}>
          {set.name}
        </Link>
      }
      tags={set.componentIds === null ? null : `${set.componentIds.length} 件家具`}
    />
  );
}
