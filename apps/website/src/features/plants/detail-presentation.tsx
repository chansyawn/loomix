import type { DetailField, DetailSection } from "@/features/detail-page/detail-page";
import { addDetailRelation, collectionMembers } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "@/features/omnidex/record-image";
import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { catalogEntryLocation } from "../omnidex/entry-location";
import { PlantsCard } from "./plants-card";
import type { PlantsDetail } from "./detail";
import { PlantDropsInfo } from "./related-items";
import { plantSeriesFields } from "./series-fields";
import { seedDetailPresentation } from "./seed-detail-presentation";
import { FlowerHybridization, flowerHybridizationSectionId } from "./flower-hybridization";

type PlantOrSeriesDetail = Extract<PlantsDetail, { kind: "item" | "series" }>;

export function plantsDetailPresentation(detail: PlantsDetail): CatalogDetailPresentation {
  if (detail.kind === "harvestablePlant") {
    const { record } = detail;
    const fields: DetailField[] = [["分类", record.stockCategory]];
    const sections: DetailSection[] = [];
    addDetailRelation(fields, sections, "可收获", "plant-harvest", [record.harvest]);
    addDetailRelation(fields, sections, "关联种子", "plant-seeds", detail.seeds);
    return {
      image: <RecordImage image={record.image} name={record.name} eager />,
      fields,
      sections,
    };
  }
  return {
    ...(detail.kind === "seed"
      ? seedDetailPresentation(detail)
      : plantOrSeriesPresentation(detail)),
    navigation: {
      groups: detail.navigation.groups,
      notice: detail.navigation.hasUnconfirmedMembership ? "其他系列的成员关系未确认" : undefined,
    },
  };
}

function plantOrSeriesPresentation(detail: PlantOrSeriesDetail): CatalogDetailPresentation {
  const { record } = detail;
  const summary = record.summary;
  const fields: DetailField[] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["产区", detail.record.originGalaxy],
          [
            "收获茬数",
            summary.harvestCounts.length > 0 ? `${summary.harvestCounts.join(" / ")} 茬` : null,
          ],
        ]
      : plantSeriesFields(detail.record);
  if (detail.kind === "item" && summary.flowerColors.length)
    fields.push(["花色", summary.flowerColors.join("、")]);

  const sections: DetailSection[] = [];
  if (detail.kind === "item") {
    addDetailRelation(fields, sections, "关联种子", "plant-seeds", detail.seeds);
    addDetailRelation(fields, sections, "来源植株", "plant-stocks", detail.stocks);
    addDetailRelation(fields, sections, "来源树木", "plant-source-trees", detail.sourceTrees);
    if (detail.matureForms.length > 0)
      sections.push({
        id: "plant-mature",
        title: "成熟形态",
        content: <PlantMatureForms detail={detail} />,
      });
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
    const members = collectionMembers("plant", detail.items, (item) => <PlantsCard item={item} />);
    fields.unshift(...members.fields);
    sections.push(...members.sections);
  }
  return { image: <RecordImage image={record.image} name={record.name} eager />, fields, sections };
}

function PlantMatureForms({ detail }: { detail: Extract<PlantsDetail, { kind: "item" }> }) {
  return (
    <div className="flex flex-col gap-4">
      {detail.matureForms.map(({ seed, stages }) => (
        <div key={seed.id} className="flex flex-col gap-3">
          {detail.matureForms.length > 1 && <h3 className="text-sm font-medium">{seed.name}</h3>}
          <div className="flex flex-wrap gap-3">
            {stages.map((stage) => (
              <div key={stage.id} className="w-72 max-w-full">
                <CatalogItemCard
                  item={stage.stockId ? stage : { name: detail.record.name, image: stage.image }}
                  itemId={stage.stockId ?? detail.record.id}
                  link={stage.stockId ? catalogEntryLocation({ id: stage.stockId }) : undefined}
                  description={
                    stage.stockId ? undefined : detail.record.description || "描述未提供"
                  }
                  fullDescription
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
