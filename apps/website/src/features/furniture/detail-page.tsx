import { collectionItemLocation } from "../collection/item-route";
import { SearchXIcon } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { buttonVariants } from "@/ui/components/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/ui/components/empty";
import { FurnitureCard, FurnitureSetCard } from "./furniture-card";
import {
  CollectionDetailLayout,
  CollectionDetailLoading,
} from "@/features/collection/detail-layout";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { FurnitureReturnLink } from "./detail-navigation";
import type { IngredientItem } from "../collection-view";
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
    <CollectionDetailLayout
      image={
        <FurnitureImage
          key={record.image}
          image={record.image}
          name={record.name}
          scene={detail.kind === "set"}
          eager
        />
      }
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
    >
      {detail.kind === "item" && <FurnitureRecipes detail={detail} />}
      <FurnitureRelated detail={detail} />
    </CollectionDetailLayout>
  );
}

function FurnitureRecipes({ detail }: { detail: Extract<FurnitureDetail, { kind: "item" }> }) {
  const recipes = detail.recipes;
  return (
    <section aria-labelledby="furniture-recipes" className="space-y-4">
      <div>
        <h2 id="furniture-recipes" className="text-lg font-semibold">
          制作配方
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">打造这件家具所需的材料</p>
      </div>
      {recipes === null ? (
        <p className="text-sm text-muted-foreground">配方信息未提供</p>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe, index) => (
            <div key={recipe.id} className="rounded-2xl border p-4">
              {recipes.length > 1 && <h3 className="mb-3 text-sm font-medium">配方 {index + 1}</h3>}
              {recipe.materials === null ? (
                <p className="text-sm text-muted-foreground">
                  {recipe.unresolvedReason || "材料信息未确认"}
                </p>
              ) : (
                <ul className="divide-y">
                  {recipe.materials.map((material) => (
                    <li
                      key={material.itemId}
                      className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                    >
                      {material.item ? (
                        <FurnitureMaterialLink item={material.item} />
                      ) : (
                        <span className="min-w-0 truncate text-sm">
                          未知材料 #{material.itemId}
                        </span>
                      )}
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        × {material.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FurnitureMaterialLink({ item }: { item: IngredientItem }) {
  return (
    <Link
      {...collectionItemLocation(item)}
      className="group/material flex min-w-0 items-center gap-3 rounded-lg outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-md border bg-muted/30">
        <FurnitureImage image={item.image} name={item.name} compact />
      </div>
      <span className="min-w-0 truncate text-sm underline-offset-4 group-hover/material:underline">
        {item.name}
      </span>
    </Link>
  );
}

function FurnitureRelated({ detail }: { detail: FurnitureDetail }) {
  return (
    <section aria-labelledby="related-furniture" className="space-y-4">
      <h2 id="related-furniture" className="text-lg font-semibold">
        {detail.kind === "item" ? "所属套组" : "套组成员"}
      </h2>
      {detail.kind === "item" ? (
        detail.sets.length > 0 ? (
          <div className="grid gap-4">
            {detail.sets.map((set) => (
              <FurnitureSetCard key={set.id} set={set} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">未归入套组</p>
        )
      ) : detail.items === null ? (
        <p className="text-sm text-muted-foreground">成员信息未提供</p>
      ) : detail.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无套组成员</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8rem),1fr))] gap-3">
          {detail.items.map((item) => (
            <FurnitureCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export function FurnitureDetailLoading() {
  return <CollectionDetailLoading label="正在加载家具详情" />;
}

export function FurnitureDetailNotFound({ view }: { view: View }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{view === "items" ? "未找到这件家具" : "未找到这个套组"}</h1>
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
