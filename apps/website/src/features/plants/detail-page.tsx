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
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import { PlantsCard, PlantSeriesCard } from "./plants-card";
import { PlantsReturnLink } from "./detail-navigation";
import type { PlantsDetail } from "./detail";
import type { View } from "./search";
import { PlantsLoadError } from "./states";
import { PlantSeedInfo } from "./seed-info";
import { PlantGrowthStages } from "./growth-stages";
import { PlantItemGrowing } from "./item-growing";
import { PlantDropsInfo, PlantRelatedItems } from "./related-items";
import { ItemCookingUsage } from "../ingredients/item-usage";

export function PlantsDetailPage({ detail }: { detail: PlantsDetail }) {
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
      {detail.kind === "series" ? (
        <>
          <PlantSeedInfo seeds={summary.seeds} itemRefs={detail.itemRefs} />
          <PlantGrowthStages groups={summary.growths} itemRefs={detail.itemRefs} />
        </>
      ) : (
        <PlantItemGrowing item={detail.record} series={detail.series} itemRefs={detail.itemRefs} />
      )}
      <PlantDropsInfo drops={summary.drops} />
      {detail.kind === "item" && <PlantRelatedItems title="来源树木" items={detail.sourceTrees} />}
      {detail.kind === "item" && <ItemCookingUsage usage={detail.cooking} />}
      <section aria-labelledby="related-plants" className="space-y-4">
        <h2 id="related-plants" className="text-lg font-semibold">
          {detail.kind === "item" ? "所属系列" : "系列成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.series.length > 0 ? (
            <>
              <div className="grid gap-4">
                {detail.series.map((series) => (
                  <PlantSeriesCard key={series.id} series={series} />
                ))}
              </div>
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
            </>
          ) : detail.hasUnconfirmedSeriesMembership ? (
            <p className="text-sm text-muted-foreground">所属系列的成员关系未确认</p>
          ) : (
            <p className="text-sm text-muted-foreground">未归入系列</p>
          )
        ) : detail.items === null ? (
          <p className="text-sm text-muted-foreground">成员信息未提供</p>
        ) : detail.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无系列成员</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
            {detail.items.map((item) => (
              <PlantsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </CollectionDetailLayout>
  );
}

export function PlantsDetailLoading() {
  return <CollectionDetailLoading label="正在加载植物详情" />;
}

export function PlantsDetailNotFound({ view }: { view: View }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{view === "items" ? "未找到这种植物" : "未找到这个系列"}</h1>
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
