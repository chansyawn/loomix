import { useRouter } from "@tanstack/react-router";
import { DetailLoading } from "@/features/omnidex/detail-layout";
import { ListPage } from "@/features/omnidex/page";
import { wideGrid } from "@/features/omnidex/grid-layout";
import { ListLoadError } from "@/features/omnidex/states";
import { Button } from "@/ui/components/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/ui/components/empty";
import { Skeleton } from "@/ui/components/skeleton";
import { StarseaReturnLink } from "./navigation";

export function StarseaListLoading() {
  return (
    <ListPage title="星海" loading>
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-9 w-full max-w-96" />
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

export function StarseaDetailLoading() {
  return <DetailLoading label="正在加载星屿资料" />;
}

export function StarseaError() {
  const router = useRouter();
  return <ListLoadError title="星海" onRetry={() => void router.invalidate()} />;
}

export function StarseaNotFound() {
  return (
    <Empty className="min-h-80">
      <EmptyHeader>
        <EmptyTitle>
          <h1>未找到星屿</h1>
        </EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" nativeButton={false} render={<StarseaReturnLink />}>
          返回星海列表
        </Button>
      </EmptyContent>
    </Empty>
  );
}
