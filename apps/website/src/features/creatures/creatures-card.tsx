import { LayersIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { CreatureItem, CreatureSeries } from "@loomix/content-schema";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/components/card";
import { RecordImage } from "@/ui/collection/record-image";
import { QualityBar } from "@/ui/collection/quality";
import { useCreaturesOrigin } from "./detail-navigation";
import { SeriesImage } from "./series-image";

const cardClass =
  "relative min-w-0 pt-0 transition-shadow hover:ring-2 hover:ring-primary/30 focus-within:ring-2 focus-within:ring-ring";
const linkClass = "outline-none after:absolute after:inset-0 after:rounded-4xl";

export function CreaturesCard({ item }: { item: CreatureItem }) {
  const origin = useCreaturesOrigin();
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
              to="/collection/creatures/items/$id"
              params={{ id: String(item.id) }}
              state={{ creaturesOrigin: origin }}
              className={linkClass}
            >
              {item.name}
            </Link>
          </h2>
        </CardTitle>
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
      </CardHeader>
    </Card>
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
    <Card size="sm" role="article" className={cardClass}>
      <div className="relative">
        <SeriesImage series={series} items={items} />
        <QualityBar quality={series.quality} />
      </div>
      <CardHeader>
        <CardTitle>
          <h2 className="truncate" title={series.name}>
            <Link
              to="/collection/creatures/series/$id"
              params={{ id: String(series.id) }}
              state={{ creaturesOrigin: origin }}
              className={linkClass}
            >
              {series.name}
            </Link>
          </h2>
        </CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto gap-1.5 text-xs text-muted-foreground">
        <LayersIcon className="size-3.5" />
        {series.creatureIds === null ? "成员信息未提供" : `${series.creatureIds.length} 种生物`}
      </CardFooter>
    </Card>
  );
}
