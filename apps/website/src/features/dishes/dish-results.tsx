import { ListToolbar } from "../list-page/toolbar";
import { ListResultsSummary } from "../list-page/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListResults } from "../list-page/results";
import { recordTableSorting } from "../omnidex/sort";
import type { useListLayout } from "../list-page/use-list-layout";
import type { DishesBrowserData } from "./data";
import { DishesCard, DishSeriesCard } from "./dishes-card";
import { filterGroups, queryDishes } from "./query";
import { emptyQuery, sortOptions, updateViewQuery } from "./search";
import type { DishesSearch, DishView, FilterKey, ViewQuery } from "./search";
import { ListEmpty } from "../list-page/states";
import { dishesTableColumns } from "./table-columns";
import { title, listPresentation } from "./list-presentation";
import { normalizeIngredientSelection } from "../ingredients/tag-filter";

type SearchUpdate = DishesSearch | ((previous: DishesSearch) => DishesSearch);

export function DishResults({
  data,
  search,
  layoutState,
  onSearchChange,
}: {
  data: DishesBrowserData;
  search: DishesSearch & { view: DishView };
  layoutState: ReturnType<typeof useListLayout>;
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
  const { layout } = layoutState;
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
        sort={{ value: query.sort, options: sortOptions, onChange: (sort) => update({ sort }) }}
        {...layoutState}
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
        renderCard={(row) =>
          "difficulty" in row ? (
            <DishesCard item={row} />
          ) : (
            <DishSeriesCard series={row} items={data.items} />
          )
        }
        empty={
          <ListEmpty
            title={search.view === "items" ? "菜肴" : "菜肴系列"}
            onClear={data[search.view].length ? clear : undefined}
          />
        }
      />
    </>
  );
}
