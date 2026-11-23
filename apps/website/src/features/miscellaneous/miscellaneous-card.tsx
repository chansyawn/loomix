import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { MiscellaneousItem } from "../omnidex-view.ts";
import { ListCard } from "@/features/omnidex/list-card";
import { RecordImage } from "@/features/omnidex/record-image";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";

export function MiscellaneousCard({ item }: { item: MiscellaneousItem }) {
  const origin = useOmnidexOrigin();
  return (
    <ListCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link {...catalogEntryLocation(item)} state={{ omnidexOrigin: origin }}>
          {item.name}
        </Link>
      }
    />
  );
}
