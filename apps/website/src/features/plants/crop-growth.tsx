import type { LinkProps } from "@tanstack/react-router";
import { CollectionItemCard } from "../collection/collection-item-card";
import { cropDetailLocation } from "../collection/item-route";
import type { CropDetail } from "./crop-detail";

export function CropGrowth({ detail, state }: { detail: CropDetail; state: LinkProps["state"] }) {
  const seedStages = detail.seeds.map((seed) => {
    const growth = seed.detail.growth;
    const stages = new Map(growth?.stages?.map((stage) => [stage.id, stage]));
    return { seed, growth, stages };
  });

  return (
    <div className="space-y-6">
      <section aria-labelledby="crop-growth-heading" className="space-y-4">
        <h2 id="crop-growth-heading" className="text-lg font-semibold">
          生长阶段
        </h2>
        <div className="flex flex-wrap items-stretch gap-3">
          {seedStages.map(({ seed, growth, stages }) => (
            <div key={seed.id} className="contents">
              <div className="w-72 max-w-full">
                <CollectionItemCard
                  item={seed}
                  itemId={seed.id}
                  description={seed.description || "描述未提供"}
                  fullDescription
                />
              </div>
              {growth?.stageIds?.map((id, index) => {
                const stage = stages.get(id);
                if (!stage) return null;
                return (
                  <div key={`${seed.id}-${id}-${index}`} className="w-72 max-w-full">
                    <CollectionItemCard
                      item={{ name: stage.name ?? "阶段名称未提供", image: stage.image }}
                      itemId={id}
                      description={`初始生长 · 阶段 ${index + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="crop-mature-heading" className="space-y-4">
        <h2 id="crop-mature-heading" className="text-lg font-semibold">
          成熟形态
        </h2>
        <div className="flex flex-wrap items-stretch gap-3">
          {seedStages.flatMap(({ stages, growth }) =>
            (growth?.matureStages ?? []).map((mature) => {
              const stage = stages.get(mature.entityId);
              const product = detail.items.find((item) => item.id === mature.productId);
              return (
                <div key={mature.entityId} className="w-72 max-w-full">
                  <CollectionItemCard
                    item={{ name: stage?.name ?? "成熟形态", image: stage?.image ?? null }}
                    itemId={mature.entityId}
                    description={product?.name ?? "产物未收录"}
                    link={
                      product
                        ? {
                            ...cropDetailLocation(detail.record.id, product.id),
                            state,
                            resetScroll: false,
                          }
                        : undefined
                    }
                  />
                </div>
              );
            }),
          )}
        </div>
      </section>
    </div>
  );
}
