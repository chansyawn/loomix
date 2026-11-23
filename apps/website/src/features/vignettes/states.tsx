import { useRouter } from "@tanstack/react-router";
import { DetailLoading } from "@/features/omnidex/detail-layout";
import { wideGrid } from "@/features/omnidex/grid-layout";
import { ListPage } from "@/features/omnidex/page";
import { ListLoadError } from "@/features/omnidex/states";
import { Button } from "@/ui/components/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/ui/components/empty";
import { Skeleton } from "@/ui/components/skeleton";
import { VignetteReturnLink } from "./navigation";

export function VignetteListLoading() {
  return (
    <ListPage title="小栖地" loading>
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-96" />
        <div className={wideGrid(80).className}>
          {[1, 2, 3, 4].map((placeholder) => (
            <Skeleton key={placeholder} className="aspect-4/3" />
          ))}
        </div>
      </div>
    </ListPage>
  );
}

export function VignetteDetailLoading() {
  return <DetailLoading label="正在加载小栖地资料" />;
}

export function VignetteError() {
  const router = useRouter();
  return <ListLoadError title="小栖地" onRetry={() => void router.invalidate()} />;
}

export function VignetteNotFound() {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyTitle>
          <h1>未找到小栖地</h1>
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<VignetteReturnLink />}>
          返回小栖地列表
        </Button>
      </EmptyContent>
    </Empty>
  );
}
