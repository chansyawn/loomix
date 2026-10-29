import { collectionItemLocation } from "../collection/item-route";
import { ChevronDownIcon, CookingPotIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { IngredientCategory, IngredientExpression } from "@loomix/schema/catalog";
import type { IngredientItem } from "../collection-view";
import { IngredientTagLink } from "../ingredients/tag-link";
import type { DishesDetail } from "./detail";
import { useDishesOrigin } from "./detail-navigation";

function IngredientItemLink({ item }: { item: IngredientItem }) {
  const origin = useDishesOrigin();
  return (
    <Link
      {...collectionItemLocation(item)}
      state={{ dishesOrigin: origin }}
      className="flex min-h-9 items-center rounded-lg px-2 py-1.5 text-sm/6 wrap-anywhere underline-offset-4 outline-none hover:bg-muted hover:underline focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      {item.name}
    </Link>
  );
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
    if (!category) return <p className="text-sm text-muted-foreground">食材类别未收录</p>;
    const matches = category.itemIds
      .map((id) => items.get(id))
      .filter((item): item is IngredientItem => item !== undefined && item.listed !== false);
    return (
      <div className="min-w-0 space-y-2">
        <details className="group/ingredient min-w-0 overflow-hidden rounded-xl border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl bg-muted/30 px-4 py-3 text-sm outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 font-medium wrap-anywhere">{category.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{matches.length} 件物品</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground group-open/ingredient:rotate-180 motion-safe:transition-transform"
            />
          </summary>
          {matches.length ? (
            <ul
              aria-label={`${category.name}候选物品`}
              className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-1 overflow-y-auto border-t p-2"
            >
              {matches.map((item) => (
                <li key={item.id} className="min-w-0">
                  <IngredientItemLink item={item} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t px-4 py-3 text-sm text-muted-foreground">暂无正式收录物品</p>
          )}
        </details>
        <IngredientTagLink
          category={category}
          className="inline-block px-2 text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          在食材中筛选“{category.name}” →
        </IngredientTagLink>
      </div>
    );
  }
  const label = expression.kind === "all" ? "同时满足" : "任选";
  return (
    <div
      role="group"
      aria-label={label}
      className="min-w-0 space-y-3 border-l-2 border-primary/50 pl-3 sm:pl-4"
    >
      <p className="text-sm font-medium">{label}</p>
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

export function DishRecipe({ detail }: { detail: Extract<DishesDetail, { kind: "item" }> }) {
  const { recipe } = detail.record;
  const emptyMessage =
    recipe === null
      ? "配方行未提供"
      : recipe.slots === null
        ? "配方行存在，食材槽位未确认"
        : recipe.slots.length === 0
          ? "已确认无需食材"
          : null;
  return (
    <section aria-labelledby="dish-recipe" className="min-w-0 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
          <CookingPotIcon aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 id="dish-recipe" className="text-lg font-semibold">
            配方
          </h2>
          {emptyMessage === null && (
            <p className="text-sm/6 text-muted-foreground">
              展开食材类别，查看图鉴已收录的候选物品。用量与实际投放规则尚未确认。
            </p>
          )}
        </div>
      </div>
      {emptyMessage !== null ? (
        <p className="rounded-2xl border bg-muted/30 px-5 py-6 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ol aria-label="配方食材条件" className="divide-y overflow-hidden rounded-3xl border">
          {recipe?.slots?.map((slot, index) => (
            <li key={slot.field} className="min-w-0 space-y-4 px-4 py-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h3 className="flex items-center gap-2.5 text-sm font-semibold">
                  <span aria-hidden="true" className="h-4 w-1 rounded-full bg-primary" />
                  食材条件 {index + 1}
                </h3>
                <span className="text-xs text-muted-foreground">用量：未确认</span>
              </div>
              {slot.expression === null ? (
                <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm/6 text-muted-foreground">
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
              <p className="text-xs/5 wrap-anywhere text-muted-foreground">
                原始条件：<code>{slot.rawExpression}</code>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
