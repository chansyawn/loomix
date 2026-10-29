import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import { CardDescription } from "@/ui/components/card";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionCard } from "@/features/collection/collection-card";
import { usePlantsOrigin } from "./detail-navigation";

export function PlantsCard({ item }: { item: PlantItem }) {
  const origin = usePlantsOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collection/plants/items/$id"
          params={{ id: String(item.id) }}
          state={{ plantsOrigin: origin }}
        >
          {item.name}
        </Link>
      }
      description={
        <CardDescription>
          <p className="truncate" title={item.category ?? undefined}>
            {item.category || "分类未提供"}
          </p>
        </CardDescription>
      }
    />
  );
}

export function PlantSeriesCard({ series }: { series: PlantSeries }) {
  const origin = usePlantsOrigin();
  return (
    <CollectionCard
      name={series.name}
      quality={series.quality}
      image={<RecordImage key={series.image} image={series.image} name={series.name} />}
      titleLink={
        <Link
          to="/collection/plants/series/$id"
          params={{ id: String(series.id) }}
          state={{ plantsOrigin: origin }}
        >
          {series.name}
        </Link>
      }
      footer={
        <>
          <LayersIcon className="size-3.5" />
          {series.plantIds === null ? "成员信息未提供" : `${series.plantIds.length} 种植物`}
        </>
      }
    />
  );
}
