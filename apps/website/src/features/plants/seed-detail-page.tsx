import { CollectionDetailLayout } from "../collection/detail-layout";
import { RecordImage } from "../collection/record-image";
import type { PlantsDetail } from "./detail";
import { PlantsCard } from "./plants-card";
import { SeedGrowthStages } from "./seed-growth";

export function SeedDetailPage({ detail }: { detail: Extract<PlantsDetail, { kind: "seed" }> }) {
  const { record } = detail;
  const { growth } = record;
  const fields: [string, string | null][] = [
    ["分类", "种子"],
    ["关联植物", `${detail.items.length} 种植物`],
  ];
  if (growth.kind === "crop")
    fields.push(["收获茬数", growth.harvestCount === null ? null : `${growth.harvestCount} 茬`]);
  return (
    <CollectionDetailLayout
      image={<RecordImage image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
    >
      <SeedGrowthStages seed={record} />
      {detail.items.length > 0 && (
        <section aria-labelledby="seed-plants" className="space-y-4">
          <h2 id="seed-plants" className="text-lg font-semibold">
            关联植物
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
            {detail.items.map((item) => (
              <PlantsCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </CollectionDetailLayout>
  );
}
