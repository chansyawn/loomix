import { catalogEntryLocation } from "@/features/omnidex/entry-location";
import { Link } from "@tanstack/react-router";
import type { DishItem, DishSeries } from "../omnidex-view.ts";
import { RecordImage } from "@/features/omnidex/record-image";
import { RecordListCard } from "@/features/omnidex/record-list-card";
import { SeriesImage } from "../omnidex/series-image";
import { useOmnidexOrigin } from "@/features/omnidex/navigation";
import { dishCardAttributes } from "./presentation";

export function DishesCard({ item }: { item: DishItem }) {
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
      tags={dishCardAttributes(item)}
    />
  );
}

export function DishSeriesCard({ series, items }: { series: DishSeries; items: DishItem[] }) {
  const origin = useOmnidexOrigin();
  return (
    <RecordListCard
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
        <Link {...catalogEntryLocation(series)} state={{ omnidexOrigin: origin }}>
          {series.name}
        </Link>
      }
      tags={series.dishIds === null ? null : `${series.dishIds.length} 道菜肴`}
    />
  );
}
