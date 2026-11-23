import type { ListLayout } from "../omnidex/layout";
import { ListToolbar } from "../omnidex/toolbar";
import { ListResultsSummary } from "../omnidex/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListEmpty } from "../omnidex/states";
import { ListTable } from "../omnidex/table";
import { listSort, tableSorting } from "../omnidex/sort";
import type { IngredientsData } from "./model";
import { ingredientFilterGroups, ingredientSelection, queryIngredients } from "./query";
import { emptyIngredientsQuery, ingredientSortOptions } from "./search";
import type { IngredientsQuery } from "./search";
import type { IngredientTagGroupKey } from "./tag-filter-policy";
import { IngredientItems } from "./cards";
import { ingredientTableColumns } from "./table-columns";

export function IngredientsBrowser({
  data,
  query,
  layout,
  onQueryChange,
  onLayoutChange,
}: {
  data: IngredientsData;
  query: IngredientsQuery;
  layout: ListLayout;
  onQueryChange: (patch: Partial<IngredientsQuery>, replace?: boolean) => void;
  onLayoutChange: (layout: ListLayout) => void;
}) {
  const normalizedQuery = { ...query, ...ingredientSelection(data, query) };
  const result = queryIngredients(data, normalizedQuery);
  const groups = ingredientFilterGroups(data, result.counts);
  const clear = () => onQueryChange(emptyIngredientsQuery());
  const filter = (key: IngredientTagGroupKey, values: string[]) =>
    onQueryChange({ [key]: values } as Partial<IngredientsQuery>);
  const chips = listFilterChips(groups, normalizedQuery, filter, {
    value: query.q,
    clear: () => onQueryChange({ q: "" }),
  });
  return (
    <>
      <ListToolbar
        title="食材"
        searchLabel="搜索食材名称"
        placeholder="搜索食材名称或拼音…"
        query={query.q}
        onQueryChange={(q, replace) => onQueryChange({ q }, replace)}
        sort={query.sort}
        sortOptions={ingredientSortOptions}
        onSortChange={(sort) => onQueryChange({ sort })}
        layout={layout}
        onLayoutChange={onLayoutChange}
        filters={
          <FilterPanel
            title="筛选食材"
            groups={groups}
            query={normalizedQuery}
            total={result.items.length}
            onFilter={filter}
            onClear={clear}
          />
        }
      />
      <ListResultsSummary total={result.items.length} unit="种食材" chips={chips} onClear={clear} />
      {result.items.length > 0 && (
        <section aria-label="食材结果" className="pb-8">
          {layout === "table" ? (
            <ListTable
              resultKey={JSON.stringify([layout, normalizedQuery])}
              rows={result.items}
              columns={ingredientTableColumns(data)}
              getRowId={(item) => String(item.id)}
              label="食材列表"
              sorting={tableSorting(query.sort === "recipes-desc" ? "original" : query.sort)}
              onSortingChange={(updater) => {
                const previous = tableSorting(
                  query.sort === "recipes-desc" ? "original" : query.sort,
                );
                const sort = listSort(typeof updater === "function" ? updater(previous) : updater);
                onQueryChange({
                  sort: sort === "name-asc" || sort === "name-desc" ? sort : "original",
                });
              }}
            />
          ) : (
            <IngredientItems items={result.items} data={data} />
          )}
        </section>
      )}
      {result.items.length === 0 && <ListEmpty title="食材" onClear={clear} />}
    </>
  );
}
