import { ListPage } from "../list-page/page";
import { useListLayout } from "../list-page/use-list-layout";
import { IngredientsBrowser } from "../ingredients/browser";
import type { DishesBrowserData } from "./data";
import type { DishesSearch } from "./search";
import { DishResults } from "./dish-results";
import { title, tabs } from "./list-presentation";

type SearchUpdate = DishesSearch | ((previous: DishesSearch) => DishesSearch);

export function DishesPage({
  data,
  search,
  onSearchChange,
}: {
  data: DishesBrowserData;
  search: DishesSearch;
  onSearchChange: (update: SearchUpdate, replace?: boolean) => Promise<void>;
}) {
  const layoutState = useListLayout(
    search.layout,
    (layout) => void onSearchChange((previous) => ({ ...previous, layout })),
  );
  return (
    <ListPage
      title={title}
      tabs={tabs.map((tab) => ({
        ...tab,
        count:
          tab.value === "ingredients" ? data.ingredients.itemsById.size : data[tab.value].length,
      }))}
      view={search.view}
      onViewChange={(view) => void onSearchChange((previous) => ({ ...previous, view }))}
    >
      {search.view === "ingredients" ? (
        <IngredientsBrowser
          data={data.ingredients}
          query={search.ingredients}
          layoutState={layoutState}
          onQueryChange={(patch, replace) =>
            void onSearchChange(
              (previous) => ({ ...previous, ingredients: { ...previous.ingredients, ...patch } }),
              replace,
            )
          }
        />
      ) : (
        <DishResults
          data={data}
          search={{ ...search, view: search.view }}
          layoutState={layoutState}
          onSearchChange={onSearchChange}
        />
      )}
    </ListPage>
  );
}
