import { PlantGrowthStages } from "./plant-growth";
import {
  CollectionDetailLayout,
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import { PlantsCard, PlantSeriesCard } from "./plants-card";
import type { PlantsDetail } from "./detail";
import { PlantDropsInfo, PlantRelatedItems } from "./related-items";
import { ItemCookingUsage } from "../ingredients/item-usage";
import { CropDetailPage } from "./crop-detail-page";
import { plantSeriesFields } from "./series-fields";

type PlantOrSeriesDetail = Exclude<PlantsDetail, { kind: "crop" }>;

export function PlantsDetailPage({
  detail,
  focus,
  onFocusChange,
}: {
  detail: PlantsDetail;
  focus?: number;
  onFocusChange: (focus?: number) => void;
}) {
  if (detail.kind === "crop")
    return (
      <CropDetailPage
        key={detail.record.id}
        detail={detail}
        focus={focus}
        onFocusChange={onFocusChange}
      />
    );
  return <PlantOrSeriesDetailPage detail={detail} />;
}

function PlantOrSeriesDetailPage({ detail }: { detail: PlantOrSeriesDetail }) {
  const { record } = detail;
  const summary = record.summary;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["原产星系", detail.record.originGalaxy],
          ["成熟周期", detail.record.maturityPeriod ?? "未确认"],
          [
            "收获茬数",
            detail.record.harvestCount === null ? null : `${detail.record.harvestCount} 茬`,
          ],
        ]
      : plantSeriesFields(detail.record);
  if (detail.kind === "item" && summary.acquisition.length)
    fields.push(["获取来源", summary.acquisition.join("、")]);
  if (detail.kind === "item" && summary.flowerColors.length)
    fields.push(["花色", summary.flowerColors.join("、")]);

  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        (detail.kind === "item" || record.description) && (
          <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
            {record.description || "描述未提供"}
          </p>
        )
      }
      fields={fields}
    >
      <PlantExtras detail={detail} />
    </CollectionDetailLayout>
  );
}

function PlantExtras({ detail }: { detail: PlantOrSeriesDetail }) {
  const sections: CollectionDetailSection[] = [];
  const summary = detail.record.summary;
  if (summary.seeds.length)
    sections.push({ key: "plant-growth", content: <PlantGrowthStages seeds={summary.seeds} /> });
  if (summary.drops.groups.length > 0)
    sections.push({
      key: "plant-drops",
      content: <PlantDropsInfo drops={summary.drops} />,
    });
  if (detail.kind === "item" && detail.sourceTrees.length > 0)
    sections.push({
      key: "plant-source-trees",
      content: <PlantRelatedItems title="来源树木" items={detail.sourceTrees} />,
    });
  if (detail.kind === "item" && detail.cooking)
    sections.push({
      key: "plant-cooking",
      content: <ItemCookingUsage usage={detail.cooking} />,
    });
  if (detail.kind === "item" && detail.series.length > 0)
    sections.push({
      key: "related-plants",
      content: <PlantSeriesRelated detail={detail} />,
    });
  if (detail.kind === "series" && detail.items?.length)
    sections.push({
      key: "related-plants",
      content: (
        <section aria-labelledby="related-plants" className="space-y-4">
          <h2 id="related-plants" className="text-lg font-semibold">
            系列成员
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
            {detail.items.map((item) => (
              <PlantsCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ),
    });
  return <CollectionDetailExtras sections={sections} />;
}

function PlantSeriesRelated({
  detail,
}: {
  detail: Extract<PlantOrSeriesDetail, { kind: "item" }>;
}) {
  return (
    <section aria-labelledby="related-plants" className="space-y-4">
      <h2 id="related-plants" className="text-lg font-semibold">
        所属系列
      </h2>
      <CollectionDetailRelatedGrid>
        {detail.series.map((series) => (
          <PlantSeriesCard key={series.id} series={series} />
        ))}
      </CollectionDetailRelatedGrid>
      {detail.relatedGroups.map(
        ({ series, items }) =>
          items.length > 0 && (
            <div key={series.id} className="space-y-3">
              <h3 className="text-sm font-medium">{series.name} · 同系列植物</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
                {items.map((item) => (
                  <PlantsCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ),
      )}
      {detail.hasUnconfirmedSeriesMembership && (
        <p className="text-sm text-muted-foreground">其他系列的成员关系未确认</p>
      )}
    </section>
  );
}
