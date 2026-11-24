import { choiceFilterChips, ListChoiceFilter } from "../list-page/choice-filter";
import { ListPage } from "../list-page/page";
import { ListResults } from "../list-page/results";
import { ListResultsSummary } from "../list-page/results-summary";
import { ListEmpty } from "../list-page/states";
import { ListToolbar } from "../list-page/toolbar";
import { useListLayout } from "../list-page/use-list-layout";
import type { NeighborsData } from "./data";
import { neighborColumns, neighborsListPresentation } from "./list-presentation";
import { NeighborCard } from "./neighbor-card";
import { queryNeighbors } from "./query";
import { neighborsSearchDefaults, neighborsSearchSchema, type NeighborsSearch } from "./search";

type SearchUpdate = NeighborsSearch | ((previous: NeighborsSearch) => NeighborsSearch);
export function NeighborsPage({
  data,
  search,
  onSearchChange,
}: {
  data: NeighborsData;
  search: NeighborsSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const results = queryNeighbors(data, search);
  const update = (patch: Partial<NeighborsSearch>, replace = false) =>
    void onSearchChange((previous) => ({ ...previous, ...patch }), replace);
  const clear = () => update(neighborsSearchDefaults);
  const layoutState = useListLayout(search.layout, (layout) => update({ layout }));
  const { toolbar, grid, choice, options } = neighborsListPresentation;
  const chips = choiceFilterChips(
    { value: search.q, clear: () => update({ q: "" }) },
    { label: search.galaxy, clear: () => update({ galaxy: "" }) },
  );
  return (
    <ListPage title={toolbar.title}>
      <ListToolbar
        {...toolbar}
        {...layoutState}
        query={search.q}
        onQueryChange={(q, replace) => update({ q }, replace)}
        filters={
          <ListChoiceFilter
            {...choice}
            options={options}
            value={search.galaxy}
            onChange={(value) =>
              update({ galaxy: neighborsSearchSchema.shape.galaxy.parse(value) })
            }
          />
        }
      />
      <ListResultsSummary total={results.length} unit="位友邻" chips={chips} onClear={clear} />
      <ListResults
        layout={layoutState.layout}
        resultKey={JSON.stringify([search.galaxy, search.q])}
        rows={results}
        columns={neighborColumns}
        getRowId={(neighbor) => String(neighbor.id)}
        label="友邻表格"
        grid={grid}
        renderCard={(neighbor) => <NeighborCard neighbor={neighbor} />}
        empty={<ListEmpty title="友邻" onClear={data.neighbors.length ? clear : undefined} />}
      />
    </ListPage>
  );
}
