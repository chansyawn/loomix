import { ListToolbar } from "../omnidex/toolbar";
import { ListResultsSummary } from "../omnidex/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { VirtualGrid } from "../omnidex/virtual-grid";
import { ListTable } from "../omnidex/table";
import { listSort, tableSorting } from "../omnidex/sort";
import { useListLayout, saveListLayout } from "../omnidex/use-list-layout";
import type { DishItem, DishSeries } from "../omnidex-view";
import type { DishesBrowserData } from "./data";
import { DishesCard, DishSeriesCard } from "./dishes-card";
import { filterGroups, queryDishes } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { DishesSearch, DishView, FilterKey, ViewQuery } from "./search";
import { DishesEmpty } from "./states";
import { dishesTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";
import { normalizeIngredientSelection } from "../ingredients/tag-filter";

type SearchUpdate = DishesSearch | ((previous: DishesSearch) => DishesSearch);

export function DishResults({
  data,
  search,
  onSearchChange,
}: {
  data: DishesBrowserData;
  search: DishesSearch & { view: DishView };
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const viewQuery = search[search.view];
  const query = {
    ...viewQuery,
    ...normalizeIngredientSelection(data.ingredients.tagSource, {
      ingredientCategories: viewQuery.ingredientCategories,
      ingredientColors: viewQuery.ingredientColors,
      ingredientQualities: viewQuery.ingredientQualities,
    }),
  };
  const layout = useListLayout(search.layout);
  const presentation = listPresentation(search.view);
  const result = queryDishes(data, search.view, query);
  const groups = filterGroups(data, search.view, result.ingredientTagCounts);
  const resultKey = JSON.stringify([search.view, layout, query]);
  const update = (patch: Partial<ViewQuery>, replace = false) =>
    void onSearchChange((previous) => updateViewQuery(previous, patch), replace);
  const clear = () =>
    void onSearchChange((previous) => ({ ...previous, [previous.view]: emptyQuery() }));
  const filter = (key: FilterKey, values: string[]) => update({ [key]: values });
  const chips = listFilterChips(groups, query, filter, {
    value: query.q,
    clear: () => update({ q: "" }),
  });
  const columns = dishesTableColumns(search.view, data.series);
  return (
    <>
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
            onFilter={filter}
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
        ) : (
          <VirtualGrid<DishItem | DishSeries>
            key={resultKey}
            rows={result.rows}
            layout={presentation.grid}
            getKey={(row) => row.id}
            renderCard={(row) =>
              "difficulty" in row ? (
                <DishesCard item={row} />
              ) : (
                <DishSeriesCard series={row} items={data.items} />
              )
            }
          />
        )
      ) : (
        <DishesEmpty onClear={clear} view={search.view} />
      )}
    </>
  );
}
