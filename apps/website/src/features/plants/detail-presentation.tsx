import type { DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "@/features/omnidex/record-image";
import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { PlantsCard } from "./plants-card";
import type { PlantsDetail } from "./detail";
import { PlantDropsInfo, PlantRelatedItems } from "./related-items";
import { ItemIngredientTags } from "../ingredients/item-usage";
import { plantSeriesFields } from "./series-fields";
import { seedDetailPresentation } from "./seed-detail-presentation";

type PlantOrSeriesDetail = Exclude<PlantsDetail, { kind: "seed" }>;

export function plantsDetailPresentation(detail: PlantsDetail): CatalogDetailPresentation {
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
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["原产星系", detail.record.originGalaxy],
          [
            "收获茬数",
            summary.harvestCounts.length > 0 ? `${summary.harvestCounts.join(" / ")} 茬` : null,
          ],
        ]
      : plantSeriesFields(detail.record);
  if (detail.kind === "item" && summary.acquisition.length)
    fields.push(["获取来源", summary.acquisition.join("、")]);
  if (detail.kind === "item" && summary.flowerColors.length)
    fields.push(["花色", summary.flowerColors.join("、")]);

  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    description: (detail.kind === "item" || record.description) && (
      <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
        {record.description || "描述未提供"}
      </p>
    ),
    fields,
    sections: plantDetailSections(detail),
  };
}

function plantDetailSections(detail: PlantOrSeriesDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.kind === "item") {
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
    if (detail.sourceTrees.length > 0)
      sections.push({
        id: "plant-source-trees",
        title: "来源树木",
        content: <PlantRelatedItems items={detail.sourceTrees} />,
      });
    if (detail.cooking)
      sections.push({
        id: "item-ingredient-tags",
        title: "食材标签",
        content: <ItemIngredientTags tags={detail.cooking.tags} />,
      });
  } else {
    sections.push({
      id: "plant-members",
      title: "系列成员",
      content: detail.items?.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
          {detail.items.map((item) => (
            <PlantsCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {detail.items === null ? "系列成员尚未确认" : "该系列暂无成员"}
        </p>
      ),
    });
  }
  return sections;
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
                  item={{ name: detail.record.name, image: stage.image }}
                  itemId={detail.record.id}
                  description={detail.record.description || "描述未提供"}
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
