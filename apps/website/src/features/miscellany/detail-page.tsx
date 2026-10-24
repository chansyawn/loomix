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
import { QualityBadge } from "@/ui/collection/quality";
import { RecordImage } from "@/ui/collection/record-image";
import type { MiscellaneousItem } from "../collection-view.ts";
import { MiscellanyReturnLink } from "./detail-navigation";
import { MiscellanyLoadError } from "./states";
import { Skeleton } from "@/ui/components/skeleton";
import { useRouter } from "@tanstack/react-router";

export function MiscellanyDetailPage({ item }: { item: MiscellaneousItem }) {
  return (
    <section className="space-y-8 pb-8">
      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="overflow-hidden rounded-xl border">
          <RecordImage key={item.image} image={item.image} name={item.name} eager />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <h1 className="wrap-break-word text-3xl leading-tight font-semibold">{item.name}</h1>
            {item.quality === null ? (
              <p className="text-sm text-muted-foreground">品阶：未提供</p>
            ) : (
              <QualityBadge quality={item.quality} />
            )}
          </div>
          <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
            {item.description || "描述未提供"}
          </p>
          <dl className="flex gap-2 text-xs text-muted-foreground">
            <dt>编号</dt>
            <dd className="tabular-nums text-foreground">{item.id}</dd>
          </dl>
          <MiscellanyReturnLink className={buttonVariants({ variant: "outline" })}>
            返回杂物列表
          </MiscellanyReturnLink>
        </div>
      </div>
    </section>
  );
}

export function MiscellanyDetailLoading() {
  return (
    <section aria-label="正在加载杂物详情" aria-busy="true" className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </section>
  );
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
