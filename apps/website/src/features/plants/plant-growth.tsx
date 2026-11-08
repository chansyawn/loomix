import { CollectionItemCard } from "../collection/collection-item-card";
import { collectionItemLocation } from "../collection/item-route";
import { usePlantsOrigin } from "./detail-navigation";
import type { PlantSeed, PlantGrowth } from "./model";

function stageGroups(growth: PlantGrowth) {
  if (growth.kind === "staged")
    return [{ label: "阶段", ids: growth.stages.map((stage) => stage.id) }];
  return [
    { label: "初始生长", ids: growth.initialStageIds },
    { label: "成熟形态", ids: growth.matureStages.map((stage) => stage.stageId) },
    { label: "再次生长", ids: growth.regrowthStageIds ?? [] },
    { label: "枯萎形态", ids: growth.witheredStageId === null ? [] : [growth.witheredStageId] },
  ].filter((group) => group.ids.length);
}

export function PlantGrowthStages({ seeds }: { seeds: PlantSeed[] }) {
  const origin = usePlantsOrigin();
  return (
    <section aria-labelledby="plant-growth-heading" className="space-y-6">
      <h2 id="plant-growth-heading" className="text-lg font-semibold">
        种子与生长阶段
      </h2>
      {seeds.map((seed) => {
        const stages = new Map(seed.growth.stages.map((stage) => [stage.id, stage]));
        return (
          <div key={seed.id} className="space-y-4">
            <h3 className="text-sm font-medium">{seed.name}</h3>
            <div className="w-72 max-w-full">
              <CollectionItemCard
                item={seed}
                itemId={seed.id}
                description={seed.description || "描述未提供"}
                fullDescription
              />
            </div>
            {stageGroups(seed.growth).map((group) => (
              <div key={group.label} className="space-y-3">
                {seed.growth.kind === "crop" ? (
                  <h3 className="text-sm font-medium">{group.label}</h3>
                ) : null}
                <div className="flex flex-wrap items-stretch gap-3">
                  {group.ids.map((id, index) => {
                    const stage = stages.get(id);
                    if (!stage) return null;
                    return (
                      <div key={id} className="w-72 max-w-full">
                        <CollectionItemCard
                          item={stage}
                          itemId={id}
                          description={`${group.label} ${index + 1}`}
                          link={
                            stage.plantId === null
                              ? undefined
                              : {
                                  ...collectionItemLocation({
                                    id: stage.plantId,
                                    catalogCategory: "plants",
                                    cropSeriesId: seed.cropSeriesId,
                                  }),
                                  state: { plantsOrigin: origin },
                                }
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
