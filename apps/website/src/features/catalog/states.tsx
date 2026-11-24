import { useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../list-page/loading";
import { useListLayout } from "../list-page/use-list-layout";
import { catalogSearchSchema, sortOptions } from "./search";
import { catalogColumns, catalogListPresentation } from "./presentation";

export function CatalogLoading() {
  const raw = useRouterState({ select: (state) => state.location.search }),
    search = catalogSearchSchema.parse(raw),
    { layout } = useListLayout(search.layout);
  const { grid, card, toolbar } = catalogListPresentation;
  return (
    <ListLoading
      grid={grid}
      card={card}
      columns={catalogColumns()}
      toolbar={{
        ...toolbar,
        layout,
        query: search.items.q,
        sort: { value: search.items.sort, options: sortOptions },
      }}
    />
  );
}
