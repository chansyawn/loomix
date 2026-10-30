import { collectionItemLocation } from "../collection/item-route";
import { SearchXIcon } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { buttonVariants } from "@/ui/components/button";
import { Card, CardContent } from "@/ui/components/card";
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
  CollectionDetailRelatedGrid,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage as FurnitureImage } from "@/features/collection/record-image";
import { FurnitureReturnLink } from "./detail-navigation";
import type { FurnitureItem, FurnitureSet, IngredientItem } from "../collection-view";
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
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
    >
      <FurnitureExtras detail={detail} />
    </CollectionDetailLayout>
  );
}

function FurnitureExtras({ detail }: { detail: FurnitureDetail }) {
  const sections: CollectionDetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.recipes?.length)
      sections.push({
        key: "furniture-recipes",
        content: <FurnitureRecipes recipes={detail.recipes} />,
      });
    if (detail.sets.length)
      sections.push({
        key: "furniture-memberships",
        content: <FurnitureMemberships sets={detail.sets} />,
      });
    if (detail.sameSetItems.length)
      sections.push({
        key: "same-set-furniture",
        content: <FurnitureSameSetItems items={detail.sameSetItems} />,
      });
  } else if (detail.items?.length) {
    sections.push({
      key: "furniture-set-members",
      content: <FurnitureSetMembers items={detail.items} />,
    });
  }
  return <CollectionDetailExtras sections={sections} />;
}

function FurnitureRecipes({
  recipes,
}: {
  recipes: NonNullable<Extract<FurnitureDetail, { kind: "item" }>["recipes"]>;
}) {
  return (
    <section aria-labelledby="furniture-recipes" className="space-y-4">
      <h2 id="furniture-recipes" className="text-lg font-semibold">
        制作配方
      </h2>
      <div className="space-y-3">
        {recipes.map((recipe, index) => (
          <div key={recipe.id} className="space-y-3">
            {recipes.length > 1 && <h3 className="mb-3 text-sm font-medium">配方 {index + 1}</h3>}
            {recipe.materials === null ? (
              <p className="text-sm text-muted-foreground">
                {recipe.unresolvedReason || "材料信息未确认"}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {recipe.materials.map((material) => (
                  <li key={material.itemId} className="max-w-full min-w-0">
                    <FurnitureMaterialCard
                      item={material.item}
                      itemId={material.itemId}
                      quantity={material.quantity}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FurnitureMaterialCard({
  item,
  itemId,
  quantity,
}: {
  item: IngredientItem | null;
  itemId: number;
  quantity: number;
}) {
  const content = (
    <>
      <div className="size-12 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
        <FurnitureImage image={item?.image ?? null} name={item?.name ?? "未知材料"} compact />
      </div>
      <span className="min-w-0 truncate text-sm">{item?.name ?? `未知材料 #${itemId}`}</span>
      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">× {quantity}</span>
    </>
  );

  if (!item)
    return (
      <Card size="sm" className="max-w-full">
        <CardContent>
          <div className="flex min-h-12 items-center gap-2">{content}</div>
        </CardContent>
      </Card>
    );

  return (
    <Card size="sm" interactive className="relative max-w-full">
      <CardContent>
        <Link
          {...collectionItemLocation(item)}
          className="flex min-h-12 w-full items-center gap-2 outline-none after:absolute after:inset-0 after:rounded-xl"
        >
          {content}
        </Link>
      </CardContent>
    </Card>
  );
}

function FurnitureMemberships({ sets }: { sets: FurnitureSet[] }) {
  return (
    <section aria-labelledby="related-furniture" className="space-y-4">
      <h2 id="related-furniture" className="text-lg font-semibold">
        所属套组
      </h2>
      <CollectionDetailRelatedGrid>
        {sets.map((set) => (
          <FurnitureSetCard key={set.id} set={set} />
        ))}
      </CollectionDetailRelatedGrid>
    </section>
  );
}

function FurnitureSameSetItems({ items }: { items: FurnitureItem[] }) {
  return (
    <section aria-labelledby="same-set-furniture" className="space-y-4">
      <h2 id="same-set-furniture" className="text-lg font-semibold">
        同组家具
      </h2>
      <FurnitureItemGrid items={items} />
    </section>
  );
}

function FurnitureSetMembers({ items }: { items: FurnitureItem[] }) {
  return (
    <section aria-labelledby="related-furniture" className="space-y-4">
      <h2 id="related-furniture" className="text-lg font-semibold">
        套组成员
      </h2>
      <FurnitureItemGrid items={items} />
    </section>
  );
}

function FurnitureItemGrid({ items }: { items: FurnitureItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
      {items.map((item) => (
        <FurnitureCard key={item.id} item={item} />
      ))}
    </div>
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
