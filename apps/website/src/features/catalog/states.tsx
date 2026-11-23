import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../omnidex/loading";
import { ListCardSkeleton } from "../omnidex/card-skeleton";
import { compactGrid } from "../omnidex/grid-layout";
import { useListLayout } from "../omnidex/use-list-layout";
import { catalogSearchSchema, sortOptions } from "./search";
import { catalogColumns } from "./presentation";

export function CatalogLoading() {
  const raw = useRouterState({ select: (state) => state.location.search }),
    search = catalogSearchSchema.parse(raw),
    layout = useListLayout(search.layout);
  return (
    <ListLoading
      title="全部"
      layout={layout}
      grid={compactGrid(164)}
      card={<ListCardSkeleton description tags />}
      columns={catalogColumns()}
      searchLabel="搜索物品名称"
      placeholder="搜索物品名称或拼音…"
      query={search.items.q}
      sort={search.items.sort}
      sortOptions={sortOptions}
    />
  );
}
