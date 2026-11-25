import { useRouter, useRouterState } from "@tanstack/react-router";
import { DetailPageLoading } from "@/features/detail-page/detail-page";
import { PageNotFound } from "@/features/layout/page-not-found";
import { ListLoading } from "@/features/list-page/loading";
import { ListChoiceFilter } from "@/features/list-page/choice-filter";
import { useListLayout } from "@/features/list-page/use-list-layout";
import { ListLoadError } from "@/features/list-page/states";
import { Button } from "@/ui/components/button";
import { VignetteReturnLink } from "./navigation";
import { vignetteColumns, vignetteListPresentation } from "./list-presentation";
import { vignetteSearchSchema } from "./search";

export function VignetteListLoading() {
  const search = vignetteSearchSchema.parse(
    useRouterState({ select: (state) => state.location.search }),
  );
  const { layout } = useListLayout(search.layout);
  const { toolbar, choice, options, grid, card } = vignetteListPresentation;
  return (
    <ListLoading
      grid={grid}
      card={card}
      columns={vignetteColumns()}
      toolbar={{
        ...toolbar,
        layout,
        query: search.q,
        filters: (
          <ListChoiceFilter {...choice} value={search.site ?? ""} options={options} disabled />
        ),
      }}
    />
  );
}

export function VignetteDetailLoading() {
  return <DetailPageLoading label="正在加载小栖地资料" imageAspect="aspect-2/1" />;
}

export function VignetteError() {
  const router = useRouter();
  return <ListLoadError title="小栖地资料暂时无法加载" onRetry={() => void router.invalidate()} />;
}

export function VignetteNotFound() {
  return (
    <PageNotFound
      title="未找到小栖地"
      action={
        <Button variant="outline" nativeButton={false} render={<VignetteReturnLink />}>
          返回小栖地列表
        </Button>
      }
    />
  );
}
