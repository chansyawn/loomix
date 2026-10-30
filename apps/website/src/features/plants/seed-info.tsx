import { Link } from "@tanstack/react-router";
import type { PlantSeed } from "./model";
import { usePlantsOrigin } from "./detail-navigation";
import { RecordImage } from "../collection/record-image";
import { splitPlantValues } from "./catalog";
import type { IngredientItem } from "../collection-view";
import { CollectionItemLink } from "../collection/item-link";
import { QualityBadge } from "../collection/quality";

export function PlantSeedLinks({ seeds }: { seeds: PlantSeed[] }) {
  const origin = usePlantsOrigin();
  if (!seeds.length) return <span className="text-muted-foreground">未提供</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {seeds.map((seed) => (
        <Link
          key={seed.id}
          to="/collection/plants/seeds/$id"
          params={{ id: String(seed.id) }}
          state={{ plantsOrigin: origin }}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {seed.name}
        </Link>
      ))}
    </div>
  );
}

export function PlantSeedInfo({
  seeds,
  itemRefs,
}: {
  seeds: PlantSeed[];
  itemRefs: ReadonlyMap<number, IngredientItem>;
}) {
  const origin = usePlantsOrigin();
  if (!seeds.length) return null;
  return (
    <section
      id="plant-seeds"
      aria-labelledby="plant-seeds-heading"
      className="scroll-mt-6 space-y-4"
    >
      <h2 id="plant-seeds-heading" className="text-lg font-semibold">
        种子
      </h2>
      {seeds.map((seed) => {
        const sources = [
          ...new Set(
            seed.detail.acquisitionConditions
              ?.map((source) => source.label)
              .flatMap(splitPlantValues) ?? [],
          ),
        ];
        return (
          <article
            key={seed.id}
            id={`seed-${seed.id}`}
            className="scroll-mt-6 rounded-2xl border p-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-20 shrink-0 overflow-hidden rounded-xl">
                <RecordImage image={seed.image} name={seed.name} compact />
              </div>
              <div className="min-w-0 space-y-2">
                <h3 className="font-medium">
                  <Link
                    to="/collection/plants/seeds/$id"
                    params={{ id: String(seed.id) }}
                    state={{ plantsOrigin: origin }}
                    className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {seed.name}
                  </Link>
                </h3>
                {seed.detail.quality !== null && <QualityBadge quality={seed.detail.quality} />}
                {seed.detail.description && (
                  <p className="text-sm/6 whitespace-pre-line text-muted-foreground">
                    {seed.detail.description}
                  </p>
                )}
                {sources.length > 0 && <p className="text-sm/6">获取来源：{sources.join("、")}</p>}
                {seed.detail.harvestCount !== null && (
                  <p className="text-sm">收获茬数：{seed.detail.harvestCount} 茬</p>
                )}
                <p className="text-sm text-muted-foreground">
                  成熟天数：
                  {seed.detail.maturityDays === null ? "未确认" : `${seed.detail.maturityDays} 天`}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  <span>可收获产物：</span>
                  {seed.productIds.map((id) => {
                    const product = itemRefs.get(id);
                    return product ? (
                      <CollectionItemLink
                        key={id}
                        item={product}
                        state={{ plantsOrigin: origin }}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
