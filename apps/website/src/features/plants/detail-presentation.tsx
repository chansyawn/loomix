import type { DetailField, DetailSection } from "@/features/detail-page/detail-page";
import { addRelationField, collectionMembers } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "@/features/omnidex/record-image";
import { quantityField } from "../detail-page/field-model";
import { catalogTagField, type OverviewTag } from "../omnidex/overview-tags";
import { catalogEntryLocation } from "../omnidex/entry-location";
import type { PlantsDetail } from "./detail";
import { PlantDropsInfo } from "./related-items";
import { plantSeriesFields } from "./series-fields";
import { seedDetailPresentation } from "./seed-detail-presentation";
import { FlowerHybridization, flowerHybridizationSectionId } from "./flower-hybridization";

type PlantOrSeriesDetail = Extract<PlantsDetail, { kind: "item" | "series" }>;

export function plantsDetailPresentation(
  detail: PlantsDetail,
  origins: readonly OverviewTag[],
): CatalogDetailPresentation {
  if (detail.kind === "harvestablePlant") {
    const { record } = detail;
    const fields: DetailField[] = [];
    addRelationField(fields, "可收获", "plant-harvest", [record.harvest]);
    addRelationField(fields, "关联种子", "plant-seeds", detail.seeds);
    return {
      image: <RecordImage image={record.image} name={record.name} eager />,
      classification: record.stockCategory,
      fields,
      sections: [],
    };
  }
  return {
    ...(detail.kind === "seed"
      ? seedDetailPresentation(detail)
      : plantOrSeriesPresentation(detail, origins)),
    navigation: {
      groups: detail.navigation.groups,
      notice: detail.navigation.hasUnconfirmedMembership ? "其他系列的成员关系未确认" : undefined,
    },
  };
}

function plantOrSeriesPresentation(
  detail: PlantOrSeriesDetail,
  origins: readonly OverviewTag[],
): CatalogDetailPresentation {
  const { record } = detail;
  const summary = record.summary;
  const fields: DetailField[] =
    detail.kind === "item"
      ? [
          catalogTagField("产区", origins),
          quantityField(
            "收获茬数",
            summary.harvestCounts.length > 0 ? `${summary.harvestCounts.join("、")} 茬` : null,
          ),
        ]
      : plantSeriesFields(detail.record);
  const sections: DetailSection[] = [];
  if (detail.kind === "item") {
    addRelationField(fields, "关联种子", "plant-seeds", detail.seeds);
    addRelationField(fields, "来源植株", "plant-stocks", detail.stocks);
    if (detail.matureForms.length)
      fields.push({
        kind: "entries",
        label: "成熟形态",
        anchor: "plant-mature",
        fullWidth: true,
        value: detail.matureForms.map(({ key, stage, seeds }) => ({
          key,
          name: stage.name,
          image: stage.image,
          destination: stage.stockId ? catalogEntryLocation({ id: stage.stockId }) : undefined,
          links: seeds.map((seed) => ({
            id: seed.id,
            name: `${seed.name}的生长阶段`,
            destination: { ...catalogEntryLocation(seed), hash: "plant-growth-heading" },
          })),
        })),
      });
    addRelationField(fields, "来源树木", "plant-source-trees", detail.sourceTrees);
    if (detail.record.summary.drops.groups.length > 0)
      sections.push({
        id: "plant-drops",
        title: "产物与掉落",
        content: <PlantDropsInfo drops={detail.record.summary.drops} />,
      });
  }
  if (detail.hybridization.length)
    sections.push({
      id: flowerHybridizationSectionId,
      title: "杂交配方",
      content: (
        <FlowerHybridization
          series={detail.hybridization}
          currentId={detail.kind === "item" ? detail.record.id : undefined}
        />
      ),
    });
  if (detail.kind === "series") {
    const [category] = summary.categories;
    const sharedCategory = category && detail.items?.every((item) => item.category === category);
    const members = collectionMembers("plant", detail.items, (item) =>
      sharedCategory ? null : item.category,
    );
    fields.push(...members.fields);
    sections.unshift(...members.sections);
  }
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    classification: detail.kind === "item" ? detail.record.category : summary.categories.join("、"),
    fields,
    sections,
  };
}
