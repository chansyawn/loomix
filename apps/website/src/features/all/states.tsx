import { useRouterState } from "@tanstack/react-router";
import { CollectionLoading } from "../collection/loading";
import { CollectionCardSkeleton } from "../collection/card-skeleton";
import { compactGrid } from "../collection/grid-layout";
import { useCollectionLayout } from "../collection/use-collection-layout";
import { allSearchSchema, sortOptions } from "./search";
import { allColumns } from "./presentation";

export function AllLoading() {
  const raw = useRouterState({ select: (state) => state.location.search }),
    search = allSearchSchema.parse(raw),
    layout = useCollectionLayout(search.layout);
  return (
    <CollectionLoading
      title="全部"
      layout={layout}
      grid={compactGrid(164)}
      card={<CollectionCardSkeleton description tags />}
      columns={allColumns()}
      searchLabel="搜索全部物品"
      placeholder="搜索编号、名称、介绍或标签"
      query={search.items.q}
      sort={search.items.sort}
      sortOptions={sortOptions}
    />
  );
}
