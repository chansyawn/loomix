import { useRouterState } from "@tanstack/react-router";
import { CollectionLoading } from "../collection/loading";
import { CollectionEmpty, CollectionLoadError } from "../collection/states";
import { useCollectionLayout } from "../collection/use-collection-layout";
import { creaturesSearchSchema, sortOptions } from "./search";
import type { View } from "./search";
import { creaturesTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

export function CreaturesLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = creaturesSearchSchema.parse(raw);
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
      columns={creaturesTableColumns(search.view)}
      query={query.q}
      sort={query.sort}
      sortOptions={sortOptions}
    />
  );
}

export function CreaturesEmpty({ onClear, view }: { onClear: () => void; view: View }) {
  return <CollectionEmpty title={view === "items" ? title : `${title}系列`} onClear={onClear} />;
}

export function CreaturesLoadError({ onRetry }: { onRetry: () => void }) {
  return <CollectionLoadError title={title} onRetry={onRetry} />;
}
