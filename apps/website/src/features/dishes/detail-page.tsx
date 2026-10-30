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
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { DishesCard, DishSeriesCard } from "./dishes-card";
import { DishesReturnLink } from "./detail-navigation";
import type { DishesDetail } from "./detail";
import type { DishView as View } from "./search";
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
          <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
            {record.description || "描述未提供"}
          </p>
        )
      }
      fields={fields}
    >
      <DishesExtras detail={detail} />
    </CollectionDetailLayout>
  );
}

function DishesExtras({ detail }: { detail: DishesDetail }) {
  const sections: CollectionDetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.record.difficultyRequirement)
      sections.push({
        key: "dish-requirement-source",
        content: <DishRequirementSource requirement={detail.record.difficultyRequirement} />,
      });
    if (detail.record.effects?.length)
      sections.push({
        key: "dish-effects",
        content: <DishEffects effects={detail.record.effects} />,
      });
    if (detail.record.recipe?.slots?.length)
      sections.push({ key: "dish-recipe", content: <DishRecipe detail={detail} /> });
  }
  if (
    (detail.kind === "item" && detail.series.length > 0) ||
    (detail.kind === "series" && detail.items?.length)
  )
    sections.push({ key: "related-dishes", content: <DishesRelated detail={detail} /> });
  return <CollectionDetailExtras sections={sections} />;
}

function DishesRelated({ detail }: { detail: DishesDetail }) {
  return (
    <section aria-labelledby="related-dishes" className="space-y-4">
      <h2 id="related-dishes" className="text-lg font-semibold">
        {detail.kind === "item" ? "所属系列" : "系列成员"}
      </h2>
      {detail.kind === "item" ? (
        <>
          <CollectionDetailRelatedGrid>
            {detail.series.map((series) => (
              <DishSeriesCard key={series.id} series={series} />
            ))}
          </CollectionDetailRelatedGrid>
          {detail.hasUnconfirmedSeriesMembership && (
            <p className="text-sm text-muted-foreground">其他系列的成员关系未确认</p>
          )}
        </>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
          {detail.items?.map((item) => (
            <DishesCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
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
