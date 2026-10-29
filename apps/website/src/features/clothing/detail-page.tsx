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
import { ClothingCard } from "./clothing-card";
import {
  CollectionDetailLayout,
  CollectionDetailLoading,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import { ClothingReturnLink } from "./detail-navigation";
import type { ClothingDetail } from "./detail";
import type { View } from "./search";
import { ClothingLoadError } from "./states";

export function ClothingDetailPage({ detail }: { detail: ClothingDetail }) {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["风格", detail.record.styles],
          ["颜色", detail.record.colors],
          ["材质", detail.record.materials],
          ["获取途径", detail.record.sources],
        ]
      : detail.kind === "appearance"
        ? [["分类", detail.record.category]]
        : [
            ["套装名称", detail.record.setName],
            ["成员数量", detail.items === null ? null : `${detail.items.length} 件服装`],
          ];
  return (
    <CollectionDetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={fields}
    >
      {detail.kind !== "appearance" && (
        <section aria-labelledby="related-clothing" className="space-y-4">
          <h2 id="related-clothing" className="text-lg font-semibold">
            {detail.kind === "item" ? "所属套装" : "套装成员"}
          </h2>
          {detail.kind === "item" ? (
            detail.sets.length > 0 ? (
              <div className="grid gap-4">
                {detail.sets.map((set) => (
                  <ClothingCard key={set.id} record={set} />
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
                <ClothingCard key={item.id} record={item} />
              ))}
            </div>
          )}
        </section>
      )}
    </CollectionDetailLayout>
  );
}

export function ClothingDetailLoading() {
  return <CollectionDetailLoading label="正在加载服饰详情" />;
}

export function ClothingDetailNotFound({ view }: { view: View }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>
            {view === "items"
              ? "未找到这件服装"
              : view === "sets"
                ? "未找到这个套装"
                : "未找到这项外观"}
          </h1>
        </EmptyTitle>
        <EmptyDescription>该条目不存在，请返回图鉴查找其他服饰。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <ClothingReturnLink view={view} className={buttonVariants({ variant: "outline" })}>
          返回服饰列表
        </ClothingReturnLink>
      </EmptyContent>
    </Empty>
  );
}

export function ClothingDetailError() {
  const router = useRouter();
  return <ClothingLoadError onRetry={() => void router.invalidate()} />;
}
