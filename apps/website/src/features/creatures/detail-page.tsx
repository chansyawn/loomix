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
import { RecordImage } from "@/features/collection/record-image";
import {
  CollectionDetailLayout,
  CollectionDetailLoading,
  CollectionDetailRelatedGrid,
} from "@/features/collection/detail-layout";
import { CreaturesCard, CreatureSeriesCard } from "./creatures-card";
import { SeriesImage } from "./series-image";
import { CreaturesReturnLink } from "./detail-navigation";
import type { CreaturesDetail } from "./detail";
import type { View } from "./search";
import { CreaturesLoadError } from "./states";
import { ItemCookingUsage } from "../ingredients/item-usage";

export function CreaturesDetailPage({ detail }: { detail: CreaturesDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["学名", detail.record.scientificName],
          ["获取方式", detail.record.sources],
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
    <CollectionDetailLayout
      image={
        detail.kind === "item" ? (
          <RecordImage key={record.image} image={record.image} name={record.name} eager />
        ) : (
          <SeriesImage series={detail.record} items={detail.items ?? []} eager />
        )
      }
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
      {detail.kind === "item" && <ItemCookingUsage usage={detail.cooking} />}
      <section aria-labelledby="related-creatures" className="space-y-4">
        <h2 id="related-creatures" className="text-lg font-semibold">
          {detail.kind === "item" ? "所属系列" : "系列成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.series.length > 0 ? (
            <CollectionDetailRelatedGrid>
              {detail.series.map((series) => (
                <CreatureSeriesCard key={series.id} series={series} items={detail.catalogItems} />
              ))}
            </CollectionDetailRelatedGrid>
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
    </CollectionDetailLayout>
  );
}

export function CreaturesDetailLoading() {
  return <CollectionDetailLoading label="正在加载生物详情" />;
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
