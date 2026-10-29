import { Link } from "@tanstack/react-router";
import type { CreatureItem, CreatureSeries } from "../collection-view.ts";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionCard } from "@/features/collection/collection-card";
import { useCreaturesOrigin } from "./detail-navigation";
import { SeriesImage } from "./series-image";

export function CreaturesCard({ item }: { item: CreatureItem }) {
  const origin = useCreaturesOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collection/creatures/items/$id"
          params={{ id: String(item.id) }}
          state={{ creaturesOrigin: origin }}
        >
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
  const origin = useCreaturesOrigin();
  return (
    <CollectionCard
      name={series.name}
      quality={series.quality}
      image={<SeriesImage series={series} items={items} />}
      titleLink={
        <Link
          to="/collection/creatures/series/$id"
          params={{ id: String(series.id) }}
          state={{ creaturesOrigin: origin }}
        >
          {series.name}
        </Link>
      }
      description={series.description}
      tags={series.creatureIds === null ? null : `${series.creatureIds.length} 种生物`}
    />
  );
}
