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
import { RecordImage } from "@/features/collection/record-image";
import {
  CollectionDetailLayout,
  CollectionDetailLoading,
} from "@/features/collection/detail-layout";
import { DishesCard, DishSeriesCard } from "./dishes-card";
import { DishesReturnLink } from "./detail-navigation";
import type { DishesDetail } from "./detail";
import type { View } from "./search";
import { DishesLoadError } from "./states";
import { DishRecipe } from "./recipe";
import { DishEffects, DishRequirementSource } from "./effects";
import { difficultyRequirementLabel, formatTastes } from "./presentation";

export function DishesDetailPage({ detail }: { detail: DishesDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["难度", detail.record.difficulty],
          ["解锁条件", difficultyRequirementLabel(detail.record.difficultyRequirement)],
          ["口味", formatTastes(detail.record.tastes)],
          ["星系风味", detail.record.galaxyFlavor],
          ["炊具", detail.record.cookware],
          ["基础效果", detail.record.effectsText],
          ["获取方式", detail.record.acquisition],
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 道菜肴`],
        ];

  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        (detail.kind === "item" || record.description) && (
          <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
            {record.description || "描述未提供"}
          </p>
        )
      }
      fields={fields}
    >
      {detail.kind === "item" && (
        <>
          <DishRequirementSource requirement={detail.record.difficultyRequirement} />
          <DishEffects effects={detail.record.effects} />
          <DishRecipe detail={detail} />
        </>
      )}
      <section aria-labelledby="related-dishes" className="space-y-4">
        <h2 id="related-dishes" className="text-lg font-semibold">
          {detail.kind === "item" ? "所属系列" : "系列成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.series.length > 0 ? (
            <>
              <div className="grid gap-4">
                {detail.series.map((series) => (
                  <DishSeriesCard key={series.id} series={series} />
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
              <DishesCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </CollectionDetailLayout>
  );
}

export function DishesDetailLoading() {
  return <CollectionDetailLoading label="正在加载菜肴详情" />;
}

export function DishesDetailNotFound({ view }: { view: View }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{view === "items" ? "未找到这道菜肴" : "未找到这个烹饪系列"}</h1>
        </EmptyTitle>
        <EmptyDescription>该条目不存在，请返回图鉴查找其他菜肴。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <DishesReturnLink view={view} className={buttonVariants({ variant: "outline" })}>
          返回菜肴列表
        </DishesReturnLink>
      </EmptyContent>
    </Empty>
  );
}

export function DishesDetailRouteError() {
  const router = useRouter();
  return <DishesLoadError onRetry={() => void router.invalidate()} />;
}
