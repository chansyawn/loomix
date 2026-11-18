import { useRouter } from "@tanstack/react-router";
import { CollectionDetailLoading } from "@/features/collection/detail-layout";
import { CollectionPage } from "@/features/collection/page";
import { wideGrid } from "@/features/collection/grid-layout";
import { CollectionLoadError } from "@/features/collection/states";
import { Button } from "@/ui/components/button";
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/ui/components/empty";
import { Skeleton } from "@/ui/components/skeleton";
import { StarseaReturnLink } from "./navigation";

export function StarseaListLoading() {
  return (
    <CollectionPage title="星海" loading>
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-9 w-full max-w-96" />
        <div className={wideGrid(80).className}>
          {[1, 2, 3, 4].map((placeholder) => (
            <Skeleton key={placeholder} className="aspect-4/3" />
          ))}
        </div>
      </div>
    </CollectionPage>
  );
}

export function StarseaDetailLoading() {
  return <CollectionDetailLoading label="正在加载星屿资料" />;
}

export function StarseaError() {
  const router = useRouter();
  return <CollectionLoadError title="星海" onRetry={() => void router.invalidate()} />;
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
