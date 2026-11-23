import { DetailLayout, DetailExtras, type DetailSection } from "@/features/omnidex/detail-layout";
import { RecordImage } from "@/features/omnidex/record-image";
import { CatalogItemCard } from "../omnidex/catalog-item-card";
import { PlantsCard } from "./plants-card";
import type { PlantsDetail } from "./detail";
import { PlantDropsInfo, PlantRelatedItems } from "./related-items";
import { ItemCookingUsage } from "../ingredients/item-usage";
import { plantSeriesFields } from "./series-fields";
import { SeedDetailPage } from "./seed-detail-page";
import { CatalogEntryNavigation } from "../omnidex/detail-navigation";

type PlantOrSeriesDetail = Exclude<PlantsDetail, { kind: "seed" }>;

export function PlantsDetailPage({ detail }: { detail: PlantsDetail }) {
  return (
    <div className="min-w-0 space-y-6">
      <CatalogEntryNavigation
        model={{
          groups: detail.navigation.groups,
          notice: detail.navigation.hasUnconfirmedMembership
            ? "其他系列的成员关系未确认"
            : undefined,
        }}
        currentId={detail.record.id}
      />
      {detail.kind === "seed" ? (
        <SeedDetailPage key={detail.record.id} detail={detail} />
      ) : (
        <PlantOrSeriesDetailPage key={detail.record.id} detail={detail} />
      )}
    </div>
  );
}

function PlantOrSeriesDetailPage({ detail }: { detail: PlantOrSeriesDetail }) {
  const { record } = detail;
  const sections = plantDetailSections(detail);
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

  return (
    <DetailLayout
      image={<RecordImage image={record.image} name={record.name} eager />}
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
      {sections.length > 0 && <DetailExtras sections={sections} />}
    </DetailLayout>
  );
}

function plantDetailSections(detail: PlantOrSeriesDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.matureForms.length > 0)
      sections.push({ key: "plant-mature", content: <PlantMatureForms detail={detail} /> });
    if (detail.record.summary.drops.groups.length > 0)
      sections.push({
        key: "plant-drops",
        content: <PlantDropsInfo drops={detail.record.summary.drops} />,
      });
    if (detail.sourceTrees.length > 0)
      sections.push({
        key: "plant-source-trees",
        content: <PlantRelatedItems title="来源树木" items={detail.sourceTrees} />,
      });
    if (detail.cooking)
      sections.push({
        key: "plant-cooking",
        content: <ItemCookingUsage usage={detail.cooking} />,
      });
  } else {
    sections.push({
      key: "plant-members",
      content: (
        <section aria-labelledby="plant-members" className="space-y-4">
          <h2 id="plant-members" className="text-lg font-semibold">
            系列成员
          </h2>
          {detail.items?.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
              {detail.items.map((item) => (
                <PlantsCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {detail.items === null ? "系列成员尚未确认" : "该系列暂无成员"}
            </p>
          )}
        </section>
      ),
    });
  }
  return sections;
}

function PlantMatureForms({ detail }: { detail: Extract<PlantsDetail, { kind: "item" }> }) {
  return (
    <section aria-labelledby="plant-mature" className="space-y-4">
      <h2 id="plant-mature" className="text-lg font-semibold">
        成熟形态
      </h2>
      {detail.matureForms.map(({ seed, stages }) => (
        <div key={seed.id} className="space-y-3">
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
    </section>
  );
}
