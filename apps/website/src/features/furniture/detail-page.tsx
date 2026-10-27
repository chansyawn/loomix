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
import { FurnitureCard, FurnitureSetCard } from "./furniture-card";
import { QualityBadge } from "@/features/collection/quality";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { FurnitureReturnLink } from "./detail-navigation";
import type { FurnitureDetail } from "./detail";
import type { View } from "./search";
import { FurnitureLoadError } from "./states";

export function FurnitureDetailPage({ detail }: { detail: FurnitureDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["类型", detail.record.type],
          ["尺寸", detail.record.size],
          ["颜色", detail.record.colors],
          ["材质", detail.record.materials],
          ["获取途径", detail.record.sources],
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 件家具`],
        ];
  return (
    <section className="space-y-8 pb-8">
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="overflow-hidden rounded-4xl border">
          <FurnitureImage
            key={record.image}
            image={record.image}
            name={record.name}
            scene={detail.kind === "set"}
            eager
          />
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
          <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
            {record.description || "描述未提供"}
          </p>
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
      <section aria-labelledby="related-furniture" className="space-y-4">
        <h2 id="related-furniture" className="text-xl font-semibold">
          {detail.kind === "item" ? "所属套装" : "套装成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.sets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {detail.sets.map((set) => (
                <FurnitureSetCard key={set.id} set={set} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">未归入套装</p>
          )
        ) : detail.items === null ? (
          <p className="text-sm text-muted-foreground">成员信息未提供</p>
        ) : detail.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无套装成员</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
            {detail.items.map((item) => (
              <FurnitureCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export function FurnitureDetailLoading() {
  return (
    <section aria-label="正在加载家具详情" aria-busy="true" className="space-y-8">
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

export function FurnitureDetailNotFound({ view }: { view: View }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{view === "items" ? "未找到这件家具" : "未找到这个套装"}</h1>
        </EmptyTitle>
        <EmptyDescription>该条目不存在，请返回图鉴查找其他家具。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <FurnitureReturnLink view={view} className={buttonVariants({ variant: "outline" })}>
          返回家具列表
        </FurnitureReturnLink>
      </EmptyContent>
    </Empty>
  );
}

export function FurnitureDetailError() {
  const router = useRouter();
  return <FurnitureLoadError onRetry={() => void router.invalidate()} />;
}
