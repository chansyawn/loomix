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
import { Skeleton } from "@/ui/components/skeleton";
import { RecordImage } from "@/ui/collection/record-image";
import { QualityBadge } from "@/ui/collection/quality";
import { PlantsCard, PlantSeriesCard } from "./plants-card";
import { PlantsReturnLink } from "./detail-navigation";
import type { PlantsDetail } from "./detail";
import type { View } from "./search";
import { PlantsLoadError } from "./states";

export function PlantsDetailPage({ detail }: { detail: PlantsDetail }) {
  const { record } = detail;
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
        ];

  return (
    <section className="space-y-8 pb-8">
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="overflow-hidden rounded-4xl border">
          <RecordImage key={record.image} image={record.image} name={record.name} eager />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight wrap-break-word">
              {record.name}
            </h1>
            {record.quality === null ? (
              <p className="text-sm text-muted-foreground">品阶：未提供</p>
            ) : (
              <QualityBadge quality={record.quality} />
            )}
          </div>
          {(detail.kind === "item" || record.description) && (
            <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
              {record.description || "描述未提供"}
            </p>
          )}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 rounded-3xl border p-5 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0 space-y-1.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm leading-6 whitespace-pre-line wrap-break-word">
                  {value || "未提供"}
                </dd>
              </div>
            ))}
          </dl>
          <PlantsReturnLink
            view={detail.kind === "item" ? "items" : "series"}
            className={buttonVariants({ variant: "outline" })}
          >
            返回植物列表
          </PlantsReturnLink>
        </div>
      </div>
      <section aria-labelledby="related-plants" className="space-y-4">
        <h2 id="related-plants" className="text-xl font-semibold">
          {detail.kind === "item" ? "所属系列" : "系列成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.series.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {detail.series.map((series) => (
                  <PlantSeriesCard key={series.id} series={series} />
                ))}
              </div>
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
    </section>
  );
}

export function PlantsDetailLoading() {
  return (
    <section aria-label="正在加载植物详情" aria-busy="true" className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-4xl" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </section>
  );
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
