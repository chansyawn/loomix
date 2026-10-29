import { Link } from "@tanstack/react-router";
import { RecordImage } from "../collection/record-image";
import type { IngredientItem } from "../collection-view";
import { usePlantsOrigin } from "./detail-navigation";
import type { PlantItem, PlantSeries } from "./model";
import { PlantSeedInfo, PlantSeedLinks } from "./seed-info";
import { PlantGrowthStages } from "./growth-stages";

export function PlantItemGrowing({
  item,
  series,
  itemRefs,
}: {
  item: PlantItem;
  series: PlantSeries[];
  itemRefs: ReadonlyMap<number, IngredientItem>;
}) {
  const origin = usePlantsOrigin();
  const mature = item.growth?.matureStages?.find((stage) => stage.productId === item.id);
  const stage = item.growth?.stages?.find((entry) => entry.id === mature?.entityId);
  if (!item.summary.seeds.length && !item.growth) return null;
  if (!series.length)
    return (
      <>
        <PlantSeedInfo seeds={item.summary.seeds} itemRefs={itemRefs} />
        <PlantGrowthStages groups={item.summary.growths} itemRefs={itemRefs} />
      </>
    );
  return (
    <section aria-label="种植信息" className="space-y-4">
      <h2 className="text-lg font-semibold">种植信息</h2>
      <div className="space-y-4 rounded-2xl border p-4">
        {item.summary.seeds.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">种子</h3>
            <PlantSeedLinks seeds={item.summary.seeds} seriesId={series[0]?.id} />
          </div>
        )}
        {stage && (
          <div className="flex items-center gap-3">
            <div className="w-20 shrink-0 overflow-hidden rounded-xl">
              <RecordImage image={stage.image} name={stage.name ?? "成熟形态"} compact />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">当前产物的成熟形态</h3>
              <p className="text-sm text-muted-foreground">{stage.name ?? "名称未提供"}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {series.map((group) => (
            <Link
              key={group.id}
              to="/collection/plants/series/$id"
              params={{ id: String(group.id) }}
              hash="plant-growth"
              state={{ plantsOrigin: origin }}
              className="text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              查看{group.name}的种子与生长阶段
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
