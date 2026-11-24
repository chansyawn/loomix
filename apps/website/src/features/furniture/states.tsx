import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../list-page/loading";
import { ListLoadError } from "../list-page/states";
import { useListLayout } from "../list-page/use-list-layout";
import { furnitureSearchSchema, sortOptions } from "./search";
import { furnitureTableColumns } from "./furniture-table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

export function FurnitureLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = furnitureSearchSchema.parse(raw);
  const query = search[search.view];
  const { layout } = useListLayout(search.layout);
  const presentation = listPresentation(search.view);
  return (
    <ListLoading
      tabs={tabs}
      view={search.view}
      {...presentation}
      columns={furnitureTableColumns(search.view)}
      toolbar={{
        title,
        layout,
        searchLabel: presentation.searchLabel,
        placeholder: presentation.placeholder,
        query: query.q,
        sort: { value: query.sort, options: sortOptions },
      }}
    />
  );
}

export function FurnitureLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={`${title}图鉴暂时无法加载`} onRetry={onRetry} />;
}
