import { useRouter, useRouterState } from "@tanstack/react-router";
import { DetailPageLoading } from "@/features/detail-page/detail-page";
import { Button } from "@/ui/components/button";
import { PageNotFound } from "../layout/page-not-found";
import { ListChoiceFilter } from "../list-page/choice-filter";
import { ListLoading } from "../list-page/loading";
import { ListLoadError } from "../list-page/states";
import { useListLayout } from "../list-page/use-list-layout";
import { neighborColumns, neighborsListPresentation } from "./list-presentation";
import { NeighborsReturnLink } from "./navigation";
import { neighborsSearchSchema } from "./search";

export function NeighborDetailLoading() {
  return <DetailPageLoading label="正在加载友邻详情" />;
}

export function NeighborsLoading() {
  const search = neighborsSearchSchema.parse(
    useRouterState({ select: (state) => state.location.search }),
  );
  const { layout } = useListLayout(search.layout);
  const { toolbar, choice, options, grid, card } = neighborsListPresentation;
  return (
    <ListLoading
      grid={grid}
      card={card}
      columns={neighborColumns}
      toolbar={{
        ...toolbar,
        layout,
        query: search.q,
        filters: <ListChoiceFilter {...choice} options={options} value={search.galaxy} disabled />,
      }}
    />
  );
}

export function NeighborsError() {
  const router = useRouter();
  return <ListLoadError title="友邻资料暂时无法加载" onRetry={() => void router.invalidate()} />;
}
export function NeighborNotFound() {
  return (
    <PageNotFound
      title="没有找到这位友邻"
      action={
        <Button variant="outline" nativeButton={false} render={<NeighborsReturnLink />}>
          返回友邻列表
        </Button>
      }
    />
  );
}
