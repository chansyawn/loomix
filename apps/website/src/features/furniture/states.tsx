import { useRouterState } from "@tanstack/react-router";
import { CollectionLoading } from "../collection/loading";
import { CollectionEmpty, CollectionLoadError } from "../collection/states";
import { useCollectionLayout } from "../collection/use-collection-layout";
import { furnitureSearchSchema, sortOptions } from "./search";
import { furnitureTableColumns } from "./furniture-table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

export function FurnitureLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = furnitureSearchSchema.parse(raw);
  const query = search[search.view];
  const layout = useCollectionLayout(search.layout);
  const presentation = listPresentation(search.view);
  return (
    <CollectionLoading
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
  return <CollectionEmpty title={title} onClear={onClear} />;
}

export function FurnitureLoadError({ onRetry }: { onRetry: () => void }) {
  return <CollectionLoadError title={title} onRetry={onRetry} />;
}
