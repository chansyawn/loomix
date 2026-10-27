import { useRouterState } from "@tanstack/react-router";
import { CollectionLoading } from "../collection/loading";
import { CollectionEmpty, CollectionLoadError } from "../collection/states";
import { useCollectionLayout } from "../collection/use-collection-layout";
import { miscellanySearchSchema, sortOptions } from "./search";
import { miscellanyTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";

export function MiscellanyLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = miscellanySearchSchema.parse(raw);
  const query = search.items;
  const layout = useCollectionLayout(search.layout);
  const presentation = listPresentation();
  return (
    <CollectionLoading
      title={title}
      layout={layout}
      {...presentation}
      columns={miscellanyTableColumns()}
      query={query.q}
      sort={query.sort}
      sortOptions={sortOptions}
    />
  );
}

export function MiscellanyEmpty({ onClear }: { onClear: () => void }) {
  return <CollectionEmpty title={title} onClear={onClear} />;
}

export function MiscellanyLoadError({ onRetry }: { onRetry: () => void }) {
  return <CollectionLoadError title={title} onRetry={onRetry} />;
}
