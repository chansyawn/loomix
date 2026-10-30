import {
  CollectionDetailLayout,
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import type { SeedDetail } from "./detail";
import { PlantsCard, PlantSeriesCard } from "./plants-card";
import { PlantGrowthStages } from "./growth-stages";
import { seedSourceLabels } from "./query";

export function SeedDetailPage({ detail }: { detail: SeedDetail }) {
  const { record } = detail;
  const sources = seedSourceLabels(record);
  const fields: [string, string | null][] = [
    ["获取来源", sources.join("、") || null],
    ["收获茬数", record.detail.harvestCount === null ? null : `${record.detail.harvestCount} 茬`],
    ["成熟天数", record.detail.maturityDays === null ? null : `${record.detail.maturityDays} 天`],
    ["可收获植物", `${record.productIds.length} 种`],
  ];
  const growths =
    record.growthId !== null && record.detail.growth
      ? [{ id: record.growthId, name: record.name, growth: record.detail.growth }]
      : [];
  const missingProducts = record.productIds.length - detail.products.length;
  const sections: CollectionDetailSection[] = [];
  if (detail.products.length > 0) {
    sections.push({
      key: "seed-products",
      content: (
        <section aria-labelledby="seed-products" className="space-y-4">
          <h2 id="seed-products" className="text-lg font-semibold">
            可收获植物
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
            {detail.products.map((item) => (
              <PlantsCard key={item.id} item={item} />
            ))}
          </div>
          {missingProducts > 0 && (
            <p className="text-sm text-muted-foreground">另有 {missingProducts} 种产物尚未收录</p>
          )}
        </section>
      ),
    });
  }
  if (growths.length > 0)
    sections.push({
      key: "plant-growth",
      content: <PlantGrowthStages groups={growths} itemRefs={detail.itemRefs} />,
    });
  if (detail.series.length > 0)
    sections.push({
      key: "seed-series",
      content: (
        <section aria-labelledby="seed-series" className="space-y-4">
          <h2 id="seed-series" className="text-lg font-semibold">
            所属系列
          </h2>
          <CollectionDetailRelatedGrid>
            {detail.series.map((series) => (
              <PlantSeriesCard key={series.id} series={series} />
            ))}
          </CollectionDetailRelatedGrid>
        </section>
      ),
    });
  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
    >
      <CollectionDetailExtras sections={sections} />
    </CollectionDetailLayout>
  );
}
