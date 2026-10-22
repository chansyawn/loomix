import { SearchXIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/ui/components/empty";
import { Skeleton } from "@/ui/components/skeleton";

export function ClothingLoading() {
  return (
    <section aria-label="正在加载服饰图鉴" aria-busy="true" className="space-y-6 py-8">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-3/4 rounded-4xl" />
        ))}
      </div>
    </section>
  );
}

export function ClothingEmpty({ onClear }: { onClear: () => void }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>没有找到匹配的服饰</h2>
        </EmptyTitle>
        <EmptyDescription>试试其他关键词，或减少一些筛选条件。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onClear}>
          清空筛选
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ClothingLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOffIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>服饰图鉴暂时无法加载</h1>
        </EmptyTitle>
        <EmptyDescription>请检查网络连接，然后再试一次。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry}>重新加载</Button>
      </EmptyContent>
    </Empty>
  );
}
