import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, CarrotIcon } from "lucide-react";
import { DishesReturnLink } from "../dishes/detail-navigation";
import { CollectionDetailLoading } from "../collection/detail-layout";
import { CollectionLoadError } from "../collection/states";
import { buttonVariants } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";
import type { IngredientCategoryDetail } from "./detail";
import { IngredientCategoryLink } from "./category-link";
import { IngredientItems } from "./cards";
import { RecipeAssociationNotice, RelatedRecipes } from "./related-recipes";

export function IngredientCategoryPage({ detail }: { detail: IngredientCategoryDetail }) {
  const [query, setQuery] = useState("");
  const { record, data } = detail;
  const items = detail.items.filter((item) =>
    item.name.toLocaleLowerCase("zh-CN").includes(query.trim().toLocaleLowerCase("zh-CN")),
  );
  const referenceCount = record.itemIds.length - detail.items.length;
  return (
    <section className="space-y-7 pb-8">
      <div className="space-y-5">
        <DishesReturnLink
          view="ingredients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          返回烹饪图鉴
        </DishesReturnLink>
        <div className="flex flex-wrap gap-2" aria-label="上级食材类别">
          {detail.parents.map((category) => (
            <IngredientCategoryLink key={category.id} category={category} />
          ))}
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{record.name}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.items.length} 种已收录食材 · {detail.dishes.length} 道关联菜肴
          </p>
        </div>
        <RecipeAssociationNotice unconfirmedCount={data.unconfirmedRecipeCount} />
        {detail.children.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="细分食材类别">
            {detail.children.map((category) => (
              <IngredientCategoryLink key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,1fr)]">
        <section aria-labelledby="category-ingredients" className="min-w-0 space-y-4">
          <h2 id="category-ingredients" className="text-lg font-semibold">
            这一类有哪些食材
          </h2>
          <Input
            aria-label="搜索当前类别食材"
            placeholder="在这一类中搜索食材…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {referenceCount > 0 && (
            <p className="text-xs leading-5 text-muted-foreground">
              另有 {referenceCount} 条物品引用尚未完整收录，暂不作为可浏览食材展示。
            </p>
          )}
          {items.length > 0 ? (
            <div
              tabIndex={0}
              role="region"
              aria-label={`${record.name}食材列表`}
              className="max-h-[44rem] overflow-y-auto rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IngredientItems items={items} data={data} />
            </div>
          ) : (
            <p className="rounded-xl border p-5 text-sm text-muted-foreground">
              {query.trim() ? "没有匹配的食材，请尝试其他名称。" : "暂无已完整收录的食材。"}
            </p>
          )}
        </section>
        <section aria-labelledby="category-recipes" className="min-w-0 space-y-4">
          <h2 id="category-recipes" className="text-lg font-semibold">
            关联菜肴 · {detail.dishes.length} 道
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            本类别中至少一种食材匹配以下条件；不代表类别内所有食材都满足附加的品质或颜色要求。
          </p>
          <RelatedRecipes matches={detail.dishes} preview />
        </section>
      </div>
    </section>
  );
}

export function IngredientCategoryLoading() {
  return <CollectionDetailLoading label="正在加载食材类别" />;
}

export function IngredientCategoryNotFound() {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CarrotIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>未找到这个食材类别</h1>
        </EmptyTitle>
        <EmptyDescription>该类别不存在，请返回烹饪图鉴浏览食材。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <DishesReturnLink view="ingredients" className={buttonVariants({ variant: "outline" })}>
          返回烹饪图鉴
        </DishesReturnLink>
      </EmptyContent>
    </Empty>
  );
}

export function IngredientCategoryError() {
  const router = useRouter();
  return <CollectionLoadError title="食材类别" onRetry={() => void router.invalidate()} />;
}
