import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/components/card";
import { RecordImage } from "@/ui/collection/record-image";
import { QualityBar } from "@/ui/collection/quality";
import { usePlantsOrigin } from "./detail-navigation";

const cardClass =
  "relative min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring";
const linkClass = "outline-none after:absolute after:inset-0 after:rounded-4xl";

export function PlantsCard({ item }: { item: PlantItem }) {
  const origin = usePlantsOrigin();
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
              to="/collection/plants/items/$id"
              params={{ id: String(item.id) }}
              state={{ plantsOrigin: origin }}
              className={linkClass}
            >
              {item.name}
            </Link>
          </h2>
        </CardTitle>
        <CardDescription className="space-y-1 text-xs">
          <p className="truncate" title={item.category ?? undefined}>
            {item.category || "分类未提供"}
          </p>
          <p className="truncate" title={item.originGalaxy ?? undefined}>
            {item.originGalaxy || "原产星系未提供"}
            {item.harvestCount === null ? "" : ` · ${item.harvestCount} 茬`}
          </p>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function PlantSeriesCard({ series }: { series: PlantSeries }) {
  const origin = usePlantsOrigin();
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
              to="/collection/plants/series/$id"
              params={{ id: String(series.id) }}
              state={{ plantsOrigin: origin }}
              className={linkClass}
            >
              {series.name}
            </Link>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto gap-1.5 text-xs text-muted-foreground">
        <LayersIcon className="size-3.5" />
        {series.plantIds === null ? "成员信息未提供" : `${series.plantIds.length} 种植物`}
      </CardFooter>
    </Card>
  );
}
