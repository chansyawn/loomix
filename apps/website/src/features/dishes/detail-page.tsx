import { SearchXIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
import { DishesCard, DishSeriesCard } from "./dishes-card";
import { DishesReturnLink } from "./detail-navigation";
import type { DishesDetail } from "./detail";
import type { View } from "./search";
import { DishesLoadError } from "./states";
import type { IngredientCategory, IngredientExpression } from "@loomix/content-schema";
import type { IngredientItem } from "../collection-view";

function IngredientItemLink({ item }: { item: IngredientItem }) {
  const params = { id: String(item.id) };
  switch (item.catalogCategory) {
    case "plants":
      return (
        <Link to="/collection/plants/items/$id" params={params}>
          {item.name}
        </Link>
      );
    case "creatures":
      return (
        <Link to="/collection/creatures/items/$id" params={params}>
          {item.name}
        </Link>
      );
    case "miscellaneous":
      return (
        <Link to="/collection/miscellany/items/$id" params={params}>
          {item.name}
        </Link>
      );
    case "furniture":
      return (
        <Link to="/collection/furniture/items/$id" params={params}>
          {item.name}
        </Link>
      );
    case "clothing":
      return (
        <Link to="/collection/clothing/items/$id" params={params}>
          {item.name}
        </Link>
      );
    case "dishes":
      return (
        <Link to="/collection/dishes/items/$id" params={params}>
          {item.name}
        </Link>
      );
  }
}

function IngredientRequirement({
  expression,
  categories,
  items,
}: {
  expression: IngredientExpression;
  categories: ReadonlyMap<number, IngredientCategory>;
  items: ReadonlyMap<number, IngredientItem>;
}) {
  if (expression.kind === "category") {
    const category = categories.get(expression.categoryId);
    if (!category) return <p>食材类别未收录</p>;
    const matches = category.itemIds
      .map((id) => items.get(id))
      .filter((item): item is IngredientItem => item !== undefined);
    return (
      <details className="border-l-2 pl-3">
        <summary className="cursor-pointer text-sm font-medium">
          {category.name} · {matches.length} 件正式收录物品
        </summary>
        {matches.length ? (
          <ul className="mt-2 grid gap-x-4 gap-y-1 pl-4 text-sm sm:grid-cols-2">
            {matches.map((item) => (
              <li key={item.id} className="min-w-0 truncate">
                <IngredientItemLink item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">暂无正式收录物品</p>
        )}
      </details>
    );
  }
  return (
    <div className="space-y-2 border-l-2 pl-3">
      <p className="text-xs font-medium text-muted-foreground">
        {expression.kind === "all" ? "同时满足" : "任选"}
      </p>
      <div className="space-y-2">
        {expression.terms.map((term, index) => (
          <IngredientRequirement
            key={`${term.kind}-${index}`}
            expression={term}
            categories={categories}
            items={items}
          />
        ))}
      </div>
    </div>
  );
}

function DishRecipe({ detail }: { detail: Extract<DishesDetail, { kind: "item" }> }) {
  const { recipe } = detail.record;
  return (
    <section aria-labelledby="dish-recipe" className="space-y-4">
      <div>
        <h2 id="dish-recipe" className="text-xl font-semibold">
          配方
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">客户端未确认食材槽位语义与用量。</p>
      </div>
      {recipe === null ? (
        <p className="text-sm text-muted-foreground">配方行未提供</p>
      ) : recipe.slots === null ? (
        <p className="text-sm text-muted-foreground">配方行存在，食材槽位未确认</p>
      ) : recipe.slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">已确认无需食材</p>
      ) : (
        <ol className="divide-y border-y">
          {recipe.slots.map((slot) => (
            <li key={slot.field} className="space-y-3 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-sm font-medium">食材槽位 {slot.field}</h3>
                <span className="text-xs text-muted-foreground">用量：未确认</span>
              </div>
              <p className="text-sm leading-6 wrap-break-word">
                <span className="text-muted-foreground">原始条件：</span>
                {slot.rawExpression}
              </p>
              {slot.expression === null ? (
                <p className="text-sm text-muted-foreground">
                  条件解析失败，食材类别或表达式尚未确认
                </p>
              ) : (
                <IngredientRequirement
                  expression={slot.expression}
                  categories={detail.ingredientCategoriesById}
                  items={detail.ingredientItemsById}
                />
              )}
              {slot.itemIds === null && slot.expression !== null && (
                <p className="text-sm text-muted-foreground">候选物品尚未确认</p>
              )}
              {slot.itemIds?.length === 0 && (
                <p className="text-sm text-muted-foreground">没有匹配的正式收录物品</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function DishesDetailPage({ detail }: { detail: DishesDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["难度", detail.record.difficulty],
          ["星系风味", detail.record.galaxyFlavor],
          ["炊具", detail.record.cookware],
          ["效果", detail.record.effects],
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 道菜肴`],
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
          <DishesReturnLink
            view={detail.kind === "item" ? "items" : "series"}
            className={buttonVariants({ variant: "outline" })}
          >
            返回菜肴列表
          </DishesReturnLink>
        </div>
      </div>
      {detail.kind === "item" && <DishRecipe detail={detail} />}
      <section aria-labelledby="related-dishes" className="space-y-4">
        <h2 id="related-dishes" className="text-xl font-semibold">
          {detail.kind === "item" ? "所属系列" : "系列成员"}
        </h2>
        {detail.kind === "item" ? (
          detail.series.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
    </section>
  );
}

export function DishesDetailLoading() {
  return (
    <section aria-label="正在加载菜肴详情" aria-busy="true" className="space-y-8">
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
