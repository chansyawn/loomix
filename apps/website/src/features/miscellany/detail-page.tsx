import { SearchXIcon } from "lucide-react";
import { buttonVariants } from "@/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";
import {
  CollectionDetailExtras,
  CollectionDetailLayout,
  CollectionDetailLoading,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import { MiscellanyReturnLink } from "./detail-navigation";
import { MiscellanyLoadError } from "./states";
import { useRouter } from "@tanstack/react-router";
import { ItemCookingUsage } from "../ingredients/item-usage";
import type { MiscellanyDetail } from "./detail";
import { MiscellanyFurnitureUses, MiscellanySourceTrees } from "./related-items";

export function MiscellanyDetailPage({ detail }: { detail: MiscellanyDetail }) {
  const item = detail.record;
  return (
    <CollectionDetailLayout
      image={<RecordImage key={item.image} image={item.image} name={item.name} eager />}
      title={item.name}
      quality={item.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {item.description || "描述未提供"}
        </p>
      }
      fields={[["获取来源", item.acquisition]]}
    >
      <MiscellanyExtras key={item.id} detail={detail} />
    </CollectionDetailLayout>
  );
}

function MiscellanyExtras({ detail }: { detail: MiscellanyDetail }) {
  const sections: CollectionDetailSection[] = [];
  if (detail.sourceTrees.length > 0)
    sections.push({
      key: "miscellany-source-trees",
      content: <MiscellanySourceTrees items={detail.sourceTrees} />,
    });
  if (detail.cooking)
    sections.push({
      key: "miscellany-cooking",
      content: <ItemCookingUsage usage={detail.cooking} />,
    });
  if (detail.furnitureUses.length > 0)
    sections.push({
      key: "miscellany-furniture",
      content: <MiscellanyFurnitureUses uses={detail.furnitureUses} />,
    });
  return <CollectionDetailExtras sections={sections} />;
}

export function MiscellanyDetailLoading() {
  return <CollectionDetailLoading label="正在加载杂物详情" />;
}

export function MiscellanyDetailNotFound() {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>未找到这件杂物</h1>
        </EmptyTitle>
        <EmptyDescription>该条目不存在，请返回图鉴查找其他杂物。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <MiscellanyReturnLink className={buttonVariants({ variant: "outline" })}>
          返回杂物列表
        </MiscellanyReturnLink>
      </EmptyContent>
    </Empty>
  );
}

export function MiscellanyDetailError() {
  const router = useRouter();
  return <MiscellanyLoadError onRetry={() => void router.invalidate()} />;
}
