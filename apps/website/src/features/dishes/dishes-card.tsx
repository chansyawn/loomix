import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { DishItem, DishSeries } from "../collection-view.ts";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/components/card";
import { RecordImage } from "@/ui/collection/record-image";
import { QualityBar } from "@/ui/collection/quality";
import { useDishesOrigin } from "./detail-navigation";

const cardClass =
  "relative min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring";
const linkClass = "outline-none after:absolute after:inset-0 after:rounded-4xl";

export function DishesCard({ item }: { item: DishItem }) {
  const origin = useDishesOrigin();
  return (
    <Card size="sm" role="article" className={cardClass}>
      <div className="relative">
        <RecordImage key={item.image} image={item.image} name={item.name} />
        <QualityBar quality={item.quality} />
      </div>
      <CardHeader>
        <CardTitle>
          <h2 className="truncate" title={item.name}>
            <Link
              to="/collection/dishes/items/$id"
              params={{ id: String(item.id) }}
              state={{ dishesOrigin: origin }}
              className={linkClass}
            >
              {item.name}
            </Link>
          </h2>
        </CardTitle>
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
      </CardHeader>
    </Card>
  );
}

export function DishSeriesCard({ series }: { series: DishSeries }) {
  const origin = useDishesOrigin();
  return (
    <Card size="sm" role="article" className={cardClass}>
      <div className="relative">
        <RecordImage key={series.image} image={series.image} name={series.name} />
        <QualityBar quality={series.quality} />
      </div>
      <CardHeader>
        <CardTitle>
          <h2 className="truncate" title={series.name}>
            <Link
              to="/collection/dishes/series/$id"
              params={{ id: String(series.id) }}
              state={{ dishesOrigin: origin }}
              className={linkClass}
            >
              {series.name}
            </Link>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto gap-1.5 text-xs text-muted-foreground">
        <LayersIcon className="size-3.5" />
        {series.dishIds === null ? "成员信息未提供" : `${series.dishIds.length} 道菜肴`}
      </CardFooter>
    </Card>
  );
}
