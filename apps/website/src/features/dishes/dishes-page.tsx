import { CollectionPage } from "../collection/page";
import { CollectionToolbar } from "../collection/toolbar";
import { CollectionResultsSummary } from "../collection/results-summary";
import { collectionFilterChips } from "../collection/filter-chips";
import { FilterPanel } from "../collection/filter-panel";
import { CollectionVirtualGrid } from "../collection/virtual-grid";
import { CollectionTable } from "../collection/table";
import { collectionSort, tableSorting } from "../collection/sort";
import { useCollectionLayout, saveCollectionLayout } from "../collection/use-collection-layout";
import type { DishItem, DishSeries } from "../collection-view";
import type { DishesData } from "./data";
import { DishesCard, DishSeriesCard } from "./dishes-card";
import { filterGroups, queryDishes } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { DishesSearch, ViewQuery } from "./search";
import { DishesEmpty } from "./states";
import { dishesTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";

type SearchUpdate = DishesSearch | ((previous: DishesSearch) => DishesSearch);

export function DishesPage({
  data,
  search,
  onSearchChange,
}: {
  data: DishesData;
  search: DishesSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const query = search[search.view];
  const layout = useCollectionLayout(search.layout);
  const presentation = listPresentation(search.view);
  const result = queryDishes(data, search.view, query);
  const groups = filterGroups(data);
  const resultKey = JSON.stringify([search.view, layout, query]);
  const update = (patch: Partial<ViewQuery>, replace = false) =>
    void onSearchChange((previous) => updateViewQuery(previous, patch), replace);
  const clear = () =>
    void onSearchChange((previous) => ({ ...previous, [previous.view]: emptyQuery() }));
  const chips = collectionFilterChips(groups, query, (key, values) => update({ [key]: values }), {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = dishesTableColumns(search.view, data.series);
  return (
    <CollectionPage
      title={title}
      tabs={tabs.map((tab) => ({ ...tab, count: data[tab.value].length }))}
      view={search.view}
      onViewChange={(view) => void onSearchChange((previous) => ({ ...previous, view }))}
    >
      <CollectionToolbar
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
          saveCollectionLayout(next);
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
      <CollectionResultsSummary
        total={result.total}
        unit={presentation.unit}
        chips={chips}
        onClear={clear}
      />
      {result.total > 0 ? (
        layout === "table" ? (
          <CollectionTable
            resultKey={resultKey}
            rows={result.rows}
            columns={columns}
            getRowId={(row) => String(row.id)}
            label={`${title}表格`}
            sorting={tableSorting(query.sort)}
            onSortingChange={(updater) => {
              const previous = tableSorting(query.sort);
              update({
                sort: collectionSort(typeof updater === "function" ? updater(previous) : updater),
              });
            }}
          />
        ) : (
          <CollectionVirtualGrid<DishItem | DishSeries>
            key={resultKey}
            rows={result.rows}
            layout={presentation.grid}
            getKey={(row) => row.id}
            renderCard={(row) =>
              "difficulty" in row ? <DishesCard item={row} /> : <DishSeriesCard series={row} />
            }
          />
        )
      ) : (
        <DishesEmpty onClear={clear} view={search.view} />
      )}
    </CollectionPage>
  );
}
