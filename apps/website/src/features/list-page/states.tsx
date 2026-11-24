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

export function ListEmpty({ title, onClear }: { title: string; onClear?: () => void }) {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h2>{onClear ? `没有找到匹配的${title}` : `暂无${title}资料`}</h2>
        </EmptyTitle>
        {onClear && <EmptyDescription>试试其他关键词，或减少一些筛选条件。</EmptyDescription>}
      </EmptyHeader>
      {onClear && (
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>
            清空筛选
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

export function ListLoadError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Empty role="alert" className="min-h-80">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WifiOffIcon />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{title}</h1>
        </EmptyTitle>
        <EmptyDescription>请检查网络连接，然后再试一次。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry}>重新加载</Button>
      </EmptyContent>
    </Empty>
  );
}
