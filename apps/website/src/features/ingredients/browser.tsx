import type { CollectionLayout } from "../collection/layout";
import { CollectionToolbar } from "../collection/toolbar";
import { CollectionResultsSummary } from "../collection/results-summary";
import { collectionFilterChips } from "../collection/filter-chips";
import { FilterPanel } from "../collection/filter-panel";
import { CollectionEmpty } from "../collection/states";
import type { IngredientsData } from "./model";
import { ingredientFilterGroups, queryIngredients } from "./query";
import { emptyIngredientsQuery, ingredientSortOptions } from "./search";
import type { IngredientsQuery } from "./search";
import { normalizeIngredientTagIds } from "./tag-filter";
import { IngredientItems } from "./cards";
import { RecipeAssociationNotice } from "./related-recipes";

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
      <div className="mb-6 rounded-2xl border bg-muted/20 px-4 py-3">
        <RecipeAssociationNotice unconfirmedCount={data.unconfirmedRecipeCount} />
      </div>
      {result.items.length > 0 && (
        <section aria-labelledby="ingredient-results" className="space-y-4 pb-8">
          <h2 id="ingredient-results" className="text-lg font-semibold">
            {result.active ? "筛选结果" : "全部食材"}
          </h2>
          <IngredientItems items={result.items} data={data} layout={layout} />
        </section>
      )}
      {result.items.length === 0 && <CollectionEmpty title="食材" onClear={clear} />}
    </>
  );
}
