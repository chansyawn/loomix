import { useRouterState } from "@tanstack/react-router";
import { CollectionLoading } from "../collection/loading";
import { CollectionEmpty, CollectionLoadError } from "../collection/states";
import { useCollectionLayout } from "../collection/use-collection-layout";
import { plantsSearchSchema, seedSortOptions, sortOptions } from "./search";
import type { View } from "./search";
import { plantsTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

export function PlantsLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = plantsSearchSchema.parse(raw);
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
      columns={plantsTableColumns(search.view)}
      query={query.q}
      sort={query.sort}
      sortOptions={search.view === "seeds" ? seedSortOptions : sortOptions}
    />
  );
}

export function PlantsEmpty({ onClear, view }: { onClear: () => void; view: View }) {
  const label = view === "items" ? title : view === "series" ? `${title}系列` : `${title}种子`;
  return <CollectionEmpty title={label} onClear={onClear} />;
}

export function PlantsLoadError({ onRetry }: { onRetry: () => void }) {
  return <CollectionLoadError title={title} onRetry={onRetry} />;
}
