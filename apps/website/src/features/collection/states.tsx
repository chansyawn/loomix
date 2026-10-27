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

export function CollectionEmpty({ title, onClear }: { title: string; onClear: () => void }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>没有找到匹配的{title}</h2>
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

export function CollectionLoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOffIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{title}图鉴暂时无法加载</h1>
        </EmptyTitle>
        <EmptyDescription>请检查网络连接，然后再试一次。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry}>重新加载</Button>
      </EmptyContent>
    </Empty>
  );
}
