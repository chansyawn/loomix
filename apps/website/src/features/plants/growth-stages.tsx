import type { IngredientItem } from "../collection-view";
import { CollectionItemLink } from "../collection/item-link";
import { RecordImage } from "../collection/record-image";
import { usePlantsOrigin } from "./detail-navigation";
import type { PlantGrowth, PlantGrowthGroup } from "./model";

function StageList({ ids, growth }: { ids: number[]; growth: PlantGrowth }) {
  const stages = new Map(growth.stages?.map((stage) => [stage.id, stage]));
  return (
    <ol className="flex flex-wrap gap-3">
      {ids.map((id, index) => {
        const stage = stages.get(id);
        return (
          <li key={`${id}-${index}`} className="w-24 space-y-2 text-center">
            <div className="overflow-hidden rounded-xl border">
              <RecordImage image={stage?.image ?? null} name={stage?.name ?? "生长阶段"} compact />
            </div>
            <p className="text-xs/5">{stage?.name ?? "阶段名称未提供"}</p>
          </li>
        );
      })}
    </ol>
  );
}

function MatureStages({
  growth,
  itemRefs,
}: {
  growth: PlantGrowth;
  itemRefs: ReadonlyMap<number, IngredientItem>;
}) {
  const origin = usePlantsOrigin();
  if (!growth.matureStages?.length) return null;
  const stages = new Map(growth.stages?.map((stage) => [stage.id, stage]));
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">成熟形态与产物</h4>
      <ul className="space-y-2">
        {growth.matureStages.map((mature) => {
          const stage = stages.get(mature.entityId);
          const product = itemRefs.get(mature.productId);
          return (
            <li key={mature.entityId} className="flex items-center gap-3 rounded-xl border p-2">
              <div className="w-14 shrink-0 overflow-hidden rounded-lg">
                <RecordImage
                  image={stage?.image ?? null}
                  name={stage?.name ?? "成熟形态"}
                  compact
                />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm">{stage?.name ?? "形态名称未提供"}</p>
                <p className="text-xs text-muted-foreground">
                  产物：
                  {product ? (
                    <CollectionItemLink item={product} state={{ plantsOrigin: origin }} />
                  ) : (
                    "未收录"
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PlantGrowthStages({
  groups,
  itemRefs,
}: {
  groups: PlantGrowthGroup[];
  itemRefs: ReadonlyMap<number, IngredientItem>;
}) {
  if (!groups.length) return null;
  return (
    <section
      id="plant-growth"
      aria-labelledby="plant-growth-heading"
      className="scroll-mt-6 space-y-4"
    >
      <div className="space-y-1">
        <h2 id="plant-growth-heading" className="text-lg font-semibold">
          生长阶段
        </h2>
        <p className="text-sm/6 text-muted-foreground">
          成熟形态为不同产物分支；阶段数量不代表成熟天数。
        </p>
      </div>
      {groups.map(({ id, name, growth }) => (
        <article key={id} className="space-y-5 rounded-2xl border p-4">
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">
            成熟天数：{growth.maturityDays === null ? "未确认" : `${growth.maturityDays} 天`}
            {growth.harvestCount === null ? "" : ` · ${growth.harvestCount} 茬`}
          </p>
          {Boolean(growth.stageIds?.length) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">初始生长</h4>
              <StageList ids={growth.stageIds ?? []} growth={growth} />
            </div>
          )}
          {Boolean(growth.regrowthStageIds?.length) && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">收获后再生</h4>
              <StageList ids={growth.regrowthStageIds ?? []} growth={growth} />
            </div>
          )}
          <MatureStages growth={growth} itemRefs={itemRefs} />
          {growth.witheredStageId !== null && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">枯萎阶段</h4>
              <StageList ids={[growth.witheredStageId]} growth={growth} />
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
