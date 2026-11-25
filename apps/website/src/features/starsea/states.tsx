import { useRouter, useRouterState } from "@tanstack/react-router";
import { DetailPageLoading } from "@/features/detail-page/detail-page";
import { PageNotFound } from "@/features/layout/page-not-found";
import { ListLoading } from "@/features/list-page/loading";
import { useListLayout } from "@/features/list-page/use-list-layout";
import { ListLoadError } from "@/features/list-page/states";
import { Button } from "@/ui/components/button";
import { Skeleton } from "@/ui/components/skeleton";
import { StarseaReturnLink } from "./navigation";
import { isletColumns, starseaListPresentation } from "./list-presentation";
import { starseaSearchSchema } from "./search";

export function StarseaListLoading() {
  const search = starseaSearchSchema.parse(
    useRouterState({ select: (state) => state.location.search }),
  );
  const { layout } = useListLayout(search.layout);
  const { toolbar, grid, card } = starseaListPresentation;
  return (
    <ListLoading
      grid={grid}
      card={card}
      columns={isletColumns()}
      toolbar={{
        ...toolbar,
        layout,
        query: search.q,
        filters: <Skeleton aria-hidden="true" className="h-8 w-36" />,
      }}
    />
  );
}

export function StarseaDetailLoading() {
  return <DetailPageLoading label="正在加载星屿资料" imageAspect="aspect-video" />;
}

export function StarseaError() {
  const router = useRouter();
  return <ListLoadError title="星海资料暂时无法加载" onRetry={() => void router.invalidate()} />;
}

export function StarseaNotFound() {
  return (
    <PageNotFound
      title="未找到星屿"
      action={
        <Button variant="outline" nativeButton={false} render={<StarseaReturnLink />}>
          返回星海列表
        </Button>
      }
    />
  );
}
