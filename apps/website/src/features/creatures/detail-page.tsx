import { SearchXIcon } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { buttonVariants } from "@/ui/components/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/ui/components/empty";
import { Skeleton } from "@/ui/components/skeleton";
import { RecordImage } from "@/ui/collection/record-image";
import { QualityBadge } from "@/ui/collection/quality";
import { CreaturesCard, CreatureSeriesCard } from "./creatures-card";
import { SeriesImage } from "./series-image";
import { CreaturesReturnLink } from "./detail-navigation";
import type { CreaturesDetail } from "./detail";
import type { View } from "./search";
import { CreaturesLoadError } from "./states";

export function CreaturesDetailPage({ detail }: { detail: CreaturesDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["地区", detail.record.region],
          ["栖息地", detail.record.habitat],
          ["出没季节", detail.record.activeSeasons],
          ["出没时段", detail.record.activeTimes],
          ["出没天气", detail.record.activeWeather],
          ...(detail.record.sizeRange
            ? [["尺寸", detail.record.sizeRange] satisfies [string, string]]
            : []),
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 种生物`],
        ];
  return (
    <section className="space-y-8 pb-8">
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="overflow-hidden rounded-4xl border">
          {detail.kind === "item" ? (
            <RecordImage key={record.image} image={record.image} name={record.name} eager />
          ) : (
            <SeriesImage series={detail.record} items={detail.items ?? []} eager />
          )}
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
        </div>
      </div>
      <section aria-labelledby="related-creatures" className="space-y-4">
        <h2 id="related-creatures" className="text-xl font-semibold">
          {detail.kind === "item" ? "所属系列" : "系列成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.series.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {detail.series.map((series) => (
                <CreatureSeriesCard key={series.id} series={series} items={detail.catalogItems} />
              ))}
            </div>
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
              <CreaturesCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export function CreaturesDetailLoading() {
  return (
    <section aria-label="正在加载生物详情" aria-busy="true" className="space-y-8">
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
export function CreaturesDetailNotFound({ view }: { view: View }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{view === "items" ? "未找到这种生物" : "未找到这个系列"}</h1>
        </EmptyTitle>
        <EmptyDescription>该条目不存在，请返回图鉴查找其他生物。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreaturesReturnLink view={view} className={buttonVariants({ variant: "outline" })}>
          返回生物列表
        </CreaturesReturnLink>
      </EmptyContent>
    </Empty>
  );
}
export function CreaturesDetailError() {
  const router = useRouter();
  return <CreaturesLoadError onRetry={() => void router.invalidate()} />;
}
