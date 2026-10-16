import { SearchXIcon } from "lucide-react";
import { Button } from "@/ui/components/button";
import { Skeleton } from "@/ui/components/skeleton";

export function FurnitureLoading() {
  return (
    <section aria-label="正在加载家具图鉴" aria-busy="true" className="space-y-6 py-8">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-3/4 rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export function FurnitureEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-muted p-5">
        <SearchXIcon className="size-7 text-muted-foreground" />
      </div>
      <h2 className="font-semibold">没有找到匹配的家具</h2>
      <p className="text-sm text-muted-foreground">试试其他关键词，或减少一些筛选条件。</p>
      <Button variant="outline" onClick={onClear}>
        清空筛选
      </Button>
    </div>
  );
}
