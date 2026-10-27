import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { CreatureItem, CreatureSeries } from "../collection-view.ts";
import { CardDescription } from "@/ui/components/card";
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
      description={
        <CardDescription className="space-y-1 text-xs">
          <p className="truncate" title={item.habitat ?? undefined}>
            {item.habitat || "栖息地未提供"}
          </p>
          <p
            className="truncate"
            title={`${item.activeSeasons || "季节未提供"} · ${item.activeTimes || "时段未提供"}`}
          >
            {item.activeSeasons || "季节未提供"} · {item.activeTimes || "时段未提供"}
          </p>
        </CardDescription>
      }
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
      footer={
        <>
          <LayersIcon className="size-3.5" />
          {series.creatureIds === null ? "成员信息未提供" : `${series.creatureIds.length} 种生物`}
        </>
      }
    />
  );
}
