import type { DetailField, DetailSection } from "@/features/detail-page/detail-page";
import { addRelationField } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "../omnidex/record-image";
import type { PlantsDetail } from "./detail";
import { SeedGrowthStages } from "./seed-growth";

export function seedDetailPresentation(
  detail: Extract<PlantsDetail, { kind: "seed" }>,
): CatalogDetailPresentation {
  const { record } = detail;
  const { growth } = record;
  const fields: DetailField[] = [];
  if (growth.kind === "crop" && growth.harvestCount !== null)
    fields.push(["收获茬数", `${growth.harvestCount} 茬`]);
  const sections: DetailSection[] = [
    { id: "plant-growth-heading", title: "生长阶段", content: <SeedGrowthStages seed={record} /> },
  ];
  if (detail.items.length) {
    addRelationField(fields, "关联植物", "seed-plants", detail.items);
  } else {
    fields.push(["关联植物", "0 种植物"]);
  }
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    classification: "种子",
    fields,
    sections,
  };
}
