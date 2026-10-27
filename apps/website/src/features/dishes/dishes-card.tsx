import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { DishItem, DishSeries } from "../collection-view.ts";
import { CardDescription } from "@/ui/components/card";
import { RecordImage } from "@/features/collection/record-image";
import { CollectionCard } from "@/features/collection/collection-card";
import { useDishesOrigin } from "./detail-navigation";

export function DishesCard({ item }: { item: DishItem }) {
  const origin = useDishesOrigin();
  return (
    <CollectionCard
      name={item.name}
      quality={item.quality}
      image={<RecordImage key={item.image} image={item.image} name={item.name} />}
      titleLink={
        <Link
          to="/collection/dishes/items/$id"
          params={{ id: String(item.id) }}
          state={{ dishesOrigin: origin }}
        >
          {item.name}
        </Link>
      }
      description={
        <CardDescription className="space-y-2 text-xs">
          <p className="line-clamp-2 leading-5" title={item.effects ?? undefined}>
            <span className="font-medium text-foreground">效果 · </span>
            {item.effects || "未提供"}
          </p>
          <p
            className="truncate"
            title={`${item.difficulty || "难度未提供"} · ${item.cookware || "炊具未提供"}`}
          >
            {item.difficulty || "难度未提供"} · {item.cookware || "炊具未提供"}
          </p>
        </CardDescription>
      }
    />
  );
}

export function DishSeriesCard({ series }: { series: DishSeries }) {
  const origin = useDishesOrigin();
  return (
    <CollectionCard
      name={series.name}
      quality={series.quality}
      image={<RecordImage key={series.image} image={series.image} name={series.name} />}
      titleLink={
        <Link
          to="/collection/dishes/series/$id"
          params={{ id: String(series.id) }}
          state={{ dishesOrigin: origin }}
        >
          {series.name}
        </Link>
      }
      footer={
        <>
          <LayersIcon className="size-3.5" />
          {series.dishIds === null ? "成员信息未提供" : `${series.dishIds.length} 道菜肴`}
        </>
      }
    />
  );
}
