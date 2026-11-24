import type { useListLayout } from "../list-page/use-list-layout";
import { ListToolbar } from "../list-page/toolbar";
import { ListResultsSummary } from "../list-page/results-summary";
import { listFilterChips } from "../omnidex/filter-chips";
import { FilterPanel } from "../omnidex/filter-panel";
import { ListEmpty } from "../list-page/states";
import { ListResults } from "../list-page/results";
import { recordTableSorting } from "../omnidex/sort";
import type { IngredientsData } from "./model";
import { ingredientFilterGroups, ingredientSelection, queryIngredients } from "./query";
import { emptyIngredientsQuery, ingredientSortOptions } from "./search";
import type { IngredientsQuery } from "./search";
import type { IngredientTagGroupKey } from "./tag-filter-policy";
import { IngredientCard } from "./cards";
import { ingredientListPresentation } from "./list-presentation";
import { ingredientTableColumns } from "./table-columns";

export function IngredientsBrowser({
  data,
  query,
  layoutState,
  onQueryChange,
}: {
  data: IngredientsData;
  query: IngredientsQuery;
  layoutState: ReturnType<typeof useListLayout>;
  onQueryChange: (patch: Partial<IngredientsQuery>, replace?: boolean) => void;
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
        {...ingredientListPresentation.toolbar}
        query={query.q}
        onQueryChange={(q, replace) => onQueryChange({ q }, replace)}
        sort={{
          value: query.sort,
          options: ingredientSortOptions,
          onChange: (sort) => onQueryChange({ sort }),
        }}
        {...layoutState}
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
      <ListResults
        layout={layoutState.layout}
        resultKey={JSON.stringify(normalizedQuery)}
        rows={result.items}
        columns={ingredientTableColumns(data)}
        getRowId={(item) => String(item.id)}
        label="食材表格"
        sorting={recordTableSorting(
          query.sort === "recipes-desc" ? "original" : query.sort,
          (sort) =>
            onQueryChange({
              sort: sort === "name-asc" || sort === "name-desc" ? sort : "original",
            }),
        )}
        grid={ingredientListPresentation.grid}
        renderCard={(item) => <IngredientCard item={item} data={data} />}
        empty={<ListEmpty title="食材" onClear={data.itemsById.size ? clear : undefined} />}
      />
    </>
  );
}
