import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { CreatureItem, CreatureSeries } from "../omnidex-view.ts";
import { RecordImage } from "@/features/omnidex/record-image";
import { RecordListCard } from "@/features/omnidex/record-list-card";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { SeriesImage } from "../omnidex/series-image";

export function CreaturesCard({ item }: { item: CreatureItem }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link {...catalogEntryLocation(item)} state={{ omnidexOrigin: origin }}>
          {item.name}
        </Link>
      }
      tags={item.category}
    />
  );
}

export function CreatureSeriesCard({
  series,
  items,
}: {
  series: CreatureSeries;
  items: CreatureItem[];
}) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
      name={series.name}
      quality={series.quality}
      image={
        <SeriesImage
          name={series.name}
          image={series.image}
          memberIds={series.creatureIds}
          items={items}
        />
      }
      titleLink={
        <Link {...catalogEntryLocation(series)} state={{ omnidexOrigin: origin }}>
          {series.name}
        </Link>
      }
      tags={series.creatureIds === null ? null : `${series.creatureIds.length} 种生物`}
    />
  );
}
