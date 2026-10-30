import { SearchXIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { buttonVariants } from "@/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";
import {
  CollectionDetailLayout,
  CollectionDetailLoading,
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import { PlantsCard, PlantSeriesCard } from "./plants-card";
import { PlantsReturnLink } from "./detail-navigation";
import type { PlantsDetail, SeedDetail } from "./detail";
import type { View } from "./search";
import { PlantsLoadError } from "./states";
import { PlantSeedInfo } from "./seed-info";
import { PlantGrowthStages } from "./growth-stages";
import { PlantItemGrowing } from "./item-growing";
import { PlantDropsInfo, PlantRelatedItems } from "./related-items";
import { ItemCookingUsage } from "../ingredients/item-usage";
import { SeedDetailPage } from "./seed-detail-page";

type PlantOrSeriesDetail = Exclude<PlantsDetail, SeedDetail>;

export function PlantsDetailPage({ detail }: { detail: PlantsDetail }) {
  if (detail.kind === "seed") return <SeedDetailPage detail={detail} />;
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
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 种植物`],
          ["分类", summary.categories.join("、") || null],
          ["原产星系", summary.galaxies.join("、") || null],
          ...(summary.harvestCounts.length
            ? [["收获茬数", `${summary.harvestCounts.join(" / ")} 茬`] as [string, string]]
            : []),
        ];
  if (summary.sources.length) fields.push(["获取来源", summary.sources.join("、")]);
  if (summary.flowerColors.length) fields.push(["花色", summary.flowerColors.join("、")]);

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
  if (detail.kind === "item") {
    if (summary.seeds.length > 0 || detail.record.growth !== null)
      sections.push({
        key: "plant-growing",
        content: (
          <PlantItemGrowing
            item={detail.record}
            series={detail.series}
            itemRefs={detail.itemRefs}
          />
        ),
      });
  } else {
    if (summary.seeds.length > 0)
      sections.push({
        key: "plant-seeds",
        content: <PlantSeedInfo seeds={summary.seeds} itemRefs={detail.itemRefs} />,
      });
    if (summary.growths.length > 0)
      sections.push({
        key: "plant-growth",
        content: <PlantGrowthStages groups={summary.growths} itemRefs={detail.itemRefs} />,
      });
  }
  if (summary.drops.items.length > 0 || summary.drops.unlistedCount > 0)
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

export function PlantsDetailLoading() {
  return <CollectionDetailLoading label="正在加载植物详情" />;
}

export function PlantsDetailNotFound({ view }: { view: View }) {
  const title =
    view === "items" ? "未找到这种植物" : view === "series" ? "未找到这个系列" : "未找到这颗种子";
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{title}</h1>
        </EmptyTitle>
        <EmptyDescription>该条目不存在，请返回图鉴查找其他植物。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <PlantsReturnLink view={view} className={buttonVariants({ variant: "outline" })}>
          返回植物列表
        </PlantsReturnLink>
      </EmptyContent>
    </Empty>
  );
}

export function PlantsDetailError() {
  const router = useRouter();
  return <PlantsLoadError onRetry={() => void router.invalidate()} />;
}
