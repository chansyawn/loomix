import type { CollectionLayout } from "../collection/layout";
import { CollectionToolbar } from "../collection/toolbar";
import { CollectionResultsSummary } from "../collection/results-summary";
import { collectionFilterChips } from "../collection/filter-chips";
import { FilterPanel } from "../collection/filter-panel";
import { CollectionEmpty } from "../collection/states";
import { CollectionTable } from "../collection/table";
import { collectionSort, tableSorting } from "../collection/sort";
import type { IngredientsData } from "./model";
import { ingredientFilterGroups, queryIngredients } from "./query";
import { emptyIngredientsQuery, ingredientSortOptions } from "./search";
import type { IngredientsQuery } from "./search";
import { normalizeIngredientTagIds } from "./tag-filter";
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
  layout: CollectionLayout;
  onQueryChange: (patch: Partial<IngredientsQuery>, replace?: boolean) => void;
  onLayoutChange: (layout: CollectionLayout) => void;
}) {
  const normalizedQuery = {
    ...query,
    ingredientTags: normalizeIngredientTagIds(data, query.ingredientTags),
  };
  const result = queryIngredients(data, normalizedQuery);
  const groups = ingredientFilterGroups(data, result.counts);
  const clear = () => onQueryChange(emptyIngredientsQuery());
  const filter = (values: string[]) =>
    onQueryChange({ ingredientTags: normalizeIngredientTagIds(data, values) });
  const chips = collectionFilterChips(groups, normalizedQuery, (_key, values) => filter(values), {
    value: query.q,
    clear: () => onQueryChange({ q: "" }),
  });
  return (
    <>
      <CollectionToolbar
        title="食材"
        searchLabel="搜索食材"
        placeholder="搜索食材名称，如番茄、虾…"
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
            onFilter={(_key, values) => filter(values)}
            onClear={clear}
          />
        }
      />
      <CollectionResultsSummary
        total={result.items.length}
        unit="种食材"
        chips={chips}
        onClear={clear}
      />
      {result.items.length > 0 && (
        <section aria-label="食材结果" className="pb-8">
          {layout === "table" ? (
            <CollectionTable
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
                const sort = collectionSort(
                  typeof updater === "function" ? updater(previous) : updater,
                );
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
      {result.items.length === 0 && <CollectionEmpty title="食材" onClear={clear} />}
    </>
  );
}
