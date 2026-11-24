import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../list-page/loading";
import { ListLoadError } from "../list-page/states";
import { useListLayout } from "../list-page/use-list-layout";
import { clothingSearchSchema, sortOptions } from "./search";
import { clothingTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

export function ClothingLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = clothingSearchSchema.parse(raw);
  const query = search[search.view];
  const { layout } = useListLayout(search.layout);
  const presentation = listPresentation(search.view);
  return (
    <ListLoading
      tabs={tabs}
      view={search.view}
      {...presentation}
      columns={clothingTableColumns(search.view)}
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

export function ClothingLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={`${title}图鉴暂时无法加载`} onRetry={onRetry} />;
}
