import type { ReactNode } from "react";
import { DetailLayout, type DetailSection } from "../omnidex/detail-layout";
import { RecordImage } from "../omnidex/record-image";
import type { PlantsDetail } from "./detail";
import { PlantsCard } from "./plants-card";
import { SeedGrowthStages } from "./seed-growth";

export function SeedDetailPage({
  detail,
  navigation,
}: {
  detail: Extract<PlantsDetail, { kind: "seed" }>;
  navigation: ReactNode;
}) {
  const { record } = detail;
  const { growth } = record;
  const fields: [string, string | null][] = [
    ["分类", "种子"],
    ["关联植物", `${detail.items.length} 种植物`],
  ];
  if (growth.kind === "crop")
    fields.push(["收获茬数", growth.harvestCount === null ? null : `${growth.harvestCount} 茬`]);
  const sections: DetailSection[] = [
    { id: "plant-growth-heading", title: "生长阶段", content: <SeedGrowthStages seed={record} /> },
  ];
  if (detail.items.length > 0)
    sections.push({
      id: "seed-plants",
      title: "关联植物",
      content: (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
          {detail.items.map((item) => (
            <PlantsCard key={item.id} item={item} />
          ))}
        </div>
      ),
    });
  return (
    <DetailLayout
      image={<RecordImage image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
      navigation={navigation}
      sections={sections}
    />
  );
}
