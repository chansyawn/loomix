import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../omnidex/loading";
import { ListEmpty, ListLoadError } from "../omnidex/states";
import { useListLayout } from "../omnidex/use-list-layout";
import { miscellaneousSearchSchema, sortOptions } from "./search";
import { miscellaneousTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";

export function MiscellaneousLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = miscellaneousSearchSchema.parse(raw);
  const query = search.items;
  const layout = useListLayout(search.layout);
  const presentation = listPresentation();
  return (
    <ListLoading
      title={title}
      layout={layout}
      {...presentation}
      columns={miscellaneousTableColumns()}
      query={query.q}
      sort={query.sort}
      sortOptions={sortOptions}
    />
  );
}

export function MiscellaneousEmpty({ onClear }: { onClear: () => void }) {
  return <ListEmpty title={title} onClear={onClear} />;
}

export function MiscellaneousLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={title} onRetry={onRetry} />;
}
