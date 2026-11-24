import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { growthStageGroups } from "./growth";
import type { PlantSeed } from "./model";

export function SeedGrowthStages({ seed }: { seed: PlantSeed }) {
  const stages = new Map(seed.growth.stages.map((stage) => [stage.id, stage]));
  return (
    <div className="flex flex-col gap-6">
      {growthStageGroups(seed.growth).map((group) => (
        <div key={group.label} className="space-y-3">
          {seed.growth.kind === "crop" && <h3 className="text-sm font-medium">{group.label}</h3>}
          <div className="flex flex-wrap items-stretch gap-3">
            {group.ids.map((id, index) => {
              const stage = stages.get(id);
              if (!stage) return null;
              return (
                <div key={id} className="w-72 max-w-full">
                  <CatalogItemCard
                    item={stage}
                    itemId={id}
                    description={`${group.label} ${index + 1}`}
                    link={
                      stage.plantId === null
                        ? undefined
                        : catalogEntryLocation({ id: stage.plantId })
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
}
