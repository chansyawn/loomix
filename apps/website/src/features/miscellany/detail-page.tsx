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
  CollectionDetailLayout,
  CollectionDetailLoading,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import type { MiscellaneousItem } from "../collection-view.ts";
import { MiscellanyReturnLink } from "./detail-navigation";
import { MiscellanyLoadError } from "./states";
import { useRouter } from "@tanstack/react-router";

export function MiscellanyDetailPage({ item }: { item: MiscellaneousItem }) {
  return (
    <CollectionDetailLayout
      image={<RecordImage key={item.image} image={item.image} name={item.name} eager />}
      title={item.name}
      quality={item.quality}
      description={
        <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
          {item.description || "描述未提供"}
        </p>
      }
      fields={[["编号", String(item.id)]]}
    />
  );
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
