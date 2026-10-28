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
import { IngredientCategories, IngredientItems } from "./cards";
import { IngredientCategoryLink } from "./category-link";
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
  const result = queryIngredients(data, query);
  const root = data.categories.find((category) => category.tagName === "食材");
  const groups = ingredientFilterGroups(data);
  const clear = () => onQueryChange(emptyIngredientsQuery());
  const chips = collectionFilterChips(
    groups,
    query,
    (key, values) => onQueryChange({ [key]: values }),
    { value: query.q, clear: () => onQueryChange({ q: "" }) },
  );
  return (
    <>
      <CollectionToolbar
        title="食材"
        searchLabel="搜索食材或类别"
        placeholder="搜索食材或类别，如番茄、鱼类…"
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
            query={query}
            total={result.items.length}
            onFilter={(key, values) => onQueryChange({ [key]: values })}
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
      {result.categories.length > 0 && (
        <section aria-labelledby="ingredient-types" className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="ingredient-types" className="text-lg font-semibold">
              {result.active ? "匹配的食材类别" : "按种类浏览"}
            </h2>
            {root && !result.active && (
              <IngredientCategoryLink category={root}>查看全部食材</IngredientCategoryLink>
            )}
          </div>
          <IngredientCategories categories={result.categories} data={data} layout={layout} />
        </section>
      )}
      {result.active && result.items.length > 0 && (
        <section aria-labelledby="ingredient-results" className="space-y-4 pb-8">
          <h2 id="ingredient-results" className="text-lg font-semibold">
            匹配的具体食材
          </h2>
          <IngredientItems items={result.items} data={data} layout={layout} />
        </section>
      )}
      {result.items.length === 0 && <CollectionEmpty title="食材" onClear={clear} />}
    </>
  );
}
