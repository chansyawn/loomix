import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../list-page/loading";
import { ListLoadError } from "../list-page/states";
import { useListLayout } from "../list-page/use-list-layout";
import { miscellaneousSearchSchema, sortOptions } from "./search";
import { miscellaneousTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";

export function MiscellaneousLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = miscellaneousSearchSchema.parse(raw);
  const query = search.items;
  const { layout } = useListLayout(search.layout);
  const presentation = listPresentation();
  return (
    <ListLoading
      {...presentation}
      columns={miscellaneousTableColumns()}
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

export function MiscellaneousLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={`${title}图鉴暂时无法加载`} onRetry={onRetry} />;
}
