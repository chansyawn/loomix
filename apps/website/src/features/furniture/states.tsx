import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../omnidex/loading";
import { ListEmpty, ListLoadError } from "../omnidex/states";
import { useListLayout } from "../omnidex/use-list-layout";
import { furnitureSearchSchema, sortOptions } from "./search";
import { furnitureTableColumns } from "./furniture-table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

export function FurnitureLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = furnitureSearchSchema.parse(raw);
  const query = search[search.view];
  const layout = useListLayout(search.layout);
  const presentation = listPresentation(search.view);
  return (
    <ListLoading
      title={title}
      tabs={tabs}
      view={search.view}
      layout={layout}
      {...presentation}
      columns={furnitureTableColumns(search.view)}
      query={query.q}
      sort={query.sort}
      sortOptions={sortOptions}
    />
  );
}

export function FurnitureEmpty({ onClear }: { onClear: () => void }) {
  return <ListEmpty title={title} onClear={onClear} />;
}

export function FurnitureLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={title} onRetry={onRetry} />;
}
