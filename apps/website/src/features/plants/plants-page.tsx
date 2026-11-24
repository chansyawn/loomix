import { ListPage } from "../list-page/page";
import { ListToolbar } from "../list-page/toolbar";
import { ListResultsSummary } from "../list-page/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListResults } from "../list-page/results";
import { recordTableSorting } from "../omnidex/sort";
import { useListLayout } from "../list-page/use-list-layout";
import type { PlantsData } from "./data";
import { PlantsCard, PlantSeriesCard, SeedCard } from "./plants-card";
import { filterGroups, queryPlants } from "./query";
import { emptyQuery, seedSortOptions, sortOptions, updateViewQuery } from "./search";
import type { PlantsSearch, ViewQuery } from "./search";
import { ListEmpty } from "../list-page/states";
import { plantsTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

type SearchUpdate = PlantsSearch | ((previous: PlantsSearch) => PlantsSearch);

export function PlantsPage({
  data,
  search,
  onSearchChange,
}: {
  data: PlantsData;
  search: PlantsSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search[search.view];
  const layoutState = useListLayout(
    search.layout,
    (layout) => void onSearchChange((previous) => ({ ...previous, layout })),
  );
  const { layout } = layoutState;
  const presentation = listPresentation(search.view);
  const viewLabel =
    search.view === "items" ? title : search.view === "series" ? `${title}系列` : `${title}种子`;
  const result = queryPlants(data, search.view, query);
  const groups = filterGroups(data, search.view);
  const resultKey = JSON.stringify([search.view, layout, query]);
  const update = (patch: Partial<ViewQuery>, replace = false) =>
    void onSearchChange((previous) => updateViewQuery(previous, patch), replace);
  const clear = () =>
    void onSearchChange((previous) =>
      previous.view === "seeds"
        ? { ...previous, seeds: { ...emptyQuery(), sort: "original" } }
        : { ...previous, [previous.view]: emptyQuery() },
    );
  const chips = listFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = plantsTableColumns(search.view, data);
  return (
    <ListPage
      title={title}
      tabs={tabs.map((tab) => ({ ...tab, count: data[tab.value].length }))}
      view={search.view}
      onViewChange={(view) => void onSearchChange((previous) => ({ ...previous, view }))}
    >
      <ListToolbar
        title={title}
        searchLabel={presentation.searchLabel}
        placeholder={presentation.placeholder}
        query={query.q}
        onQueryChange={(q, replace) => update({ q }, replace)}
        sort={{
          value: query.sort,
          options: search.view === "seeds" ? seedSortOptions : sortOptions,
          onChange: (sort) => update({ sort }),
        }}
        {...layoutState}
        filters={
          <FilterPanel
            title={`筛选${title}`}
            groups={groups}
            query={query}
            total={result.total}
            onFilter={(key, values) => update({ [key]: values })}
            onClear={clear}
          />
        }
      />
      <ListResultsSummary
        total={result.total}
        unit={presentation.unit}
        chips={chips}
        onClear={clear}
      />
      <ListResults
        layout={layout}
        resultKey={resultKey}
        rows={result.rows}
        columns={columns}
        getRowId={(row) => String(row.id)}
        label={`${title}表格`}
        sorting={recordTableSorting(query.sort, (sort) => update({ sort }))}
        grid={presentation.grid}
        virtual
        renderCard={(row) => {
          if ("growth" in row) return <SeedCard seed={row} />;
          return "category" in row ? <PlantsCard item={row} /> : <PlantSeriesCard series={row} />;
        }}
        empty={
          <ListEmpty title={viewLabel} onClear={data[search.view].length ? clear : undefined} />
        }
      />
    </ListPage>
  );
}
