import { Link } from "@tanstack/react-router";
import type { DishItem, DishSeries } from "../collection-view.ts";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionCard } from "@/features/collection/collection-card";
import { SeriesImage } from "../collection/series-image";
import { useCollectionOrigin } from "@/features/collection/navigation";
import { formatTastes } from "./presentation";

export function DishesCard({ item }: { item: DishItem }) {
  const origin = useCollectionOrigin();
  const attributes = [formatTastes(item.tastes), item.difficulty, item.cookware]
    .filter(Boolean)
    .join(" · ");
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
      tags={attributes}
    />
  );
}

export function DishSeriesCard({ series, items }: { series: DishSeries; items: DishItem[] }) {
  const origin = useCollectionOrigin();
  return (
    <CollectionCard
      name={series.name}
      quality={series.quality}
      image={
        <SeriesImage
          name={series.name}
          image={series.image}
          memberIds={series.dishIds}
          items={items}
        />
      }
      titleLink={
        <Link
          to="/collections/records/$id"
          params={{ id: String(series.id) }}
          state={{ collectionOrigin: origin }}
        >
          {series.name}
        </Link>
      }
      description={series.description}
      tags={series.dishIds === null ? null : `${series.dishIds.length} 道菜肴`}
    />
  );
}
