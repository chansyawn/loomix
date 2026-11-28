import type { DetailField, DetailSection } from "@/features/detail-page/detail-page";
import { addDetailRelation, SectionCount } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "../omnidex/record-image";
import type { PlantsDetail } from "./detail";
import { PlantsCard } from "./plants-card";
import { SeedGrowthStages } from "./seed-growth";

export function seedDetailPresentation(
  detail: Extract<PlantsDetail, { kind: "seed" }>,
): CatalogDetailPresentation {
  const { record } = detail;
  const { growth } = record;
  const fields: DetailField[] = [["分类", "种子"]];
  const sections: DetailSection[] = [
    { id: "plant-growth-heading", title: "生长阶段", content: <SeedGrowthStages seed={record} /> },
  ];
  if (detail.items.length === 1) {
    addDetailRelation(fields, sections, "关联植物", "seed-plants", detail.items);
  } else if (detail.items.length > 1) {
    fields.push([
      "关联植物",
      <SectionCount anchor="seed-plants">{detail.items.length} 种植物</SectionCount>,
    ]);
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
  } else {
    fields.push(["关联植物", "0 种植物"]);
  }
  if (growth.kind === "crop")
    fields.push(["收获茬数", growth.harvestCount === null ? null : `${growth.harvestCount} 茬`]);
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    fields,
    sections,
  };
}
