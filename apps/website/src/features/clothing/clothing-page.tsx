import { ListPage } from "../omnidex/page";
import { ListToolbar } from "../omnidex/toolbar";
import { ListResultsSummary } from "../omnidex/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { VirtualGrid } from "../omnidex/virtual-grid";
import { ListTable } from "../omnidex/table";
import { listSort, tableSorting } from "../omnidex/sort";
import { useListLayout, saveListLayout } from "../omnidex/use-list-layout";
import type { ClothingData } from "./data";
import { ClothingCard } from "./clothing-card";
import { filterGroups, queryClothing } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { ClothingSearch, ViewQuery } from "./search";
import { ClothingEmpty } from "./states";
import { clothingTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

type SearchUpdate = ClothingSearch | ((previous: ClothingSearch) => ClothingSearch);

export function ClothingPage({
  data,
  search,
  onSearchChange,
}: {
  data: ClothingData;
  search: ClothingSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search[search.view];
  const layout = useListLayout(search.layout);
  const presentation = listPresentation(search.view);
  const result = queryClothing(data, search.view, query);
  const groups = filterGroups(data, search.view);
  const resultKey = JSON.stringify([search.view, layout, query]);
  const update = (patch: Partial<ViewQuery>, replace = false) =>
    void onSearchChange((previous) => updateViewQuery(previous, patch), replace);
  const clear = () =>
    void onSearchChange((previous) => ({ ...previous, [previous.view]: emptyQuery() }));
  const chips = listFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = clothingTableColumns(search.view, data.outfits);
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
        sort={query.sort}
        sortOptions={sortOptions}
        onSortChange={(sort) => update({ sort })}
        layout={layout}
        onLayoutChange={(next) => {
          saveListLayout(next);
          void onSearchChange((previous) => ({ ...previous, layout: next }));
        }}
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
      {result.total > 0 ? (
        layout === "table" ? (
          <ListTable
            resultKey={resultKey}
            rows={result.rows}
            columns={columns}
            getRowId={(row) => String(row.id)}
            label={`${title}表格`}
            sorting={tableSorting(query.sort)}
            onSortingChange={(updater) => {
              const previous = tableSorting(query.sort);
              update({
                sort: listSort(typeof updater === "function" ? updater(previous) : updater),
              });
            }}
          />
        ) : search.view === "items" || search.view === "neighborOutfit" ? (
          <VirtualGrid
            key={resultKey}
            rows={result.rows}
            layout={presentation.grid}
            getKey={(row) => row.id}
            renderCard={(row) => <ClothingCard record={row} />}
          />
        ) : (
          <div className={`${presentation.grid.className} pb-8`}>
            {result.rows.map((row) => (
              <ClothingCard key={row.id} record={row} />
            ))}
          </div>
        )
      ) : (
        <ClothingEmpty onClear={clear} />
      )}
    </ListPage>
  );
}
