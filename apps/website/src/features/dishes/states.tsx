import { useRouter, useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../list-page/loading";
import { ListLoadError } from "../list-page/states";
import { useListLayout } from "../list-page/use-list-layout";
import { dishesSearchSchema, sortOptions } from "./search";
import { dishesTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";
import { ingredientListPresentation } from "../ingredients/list-presentation";
import { ingredientSortOptions } from "../ingredients/search";
import { ingredientTableColumns } from "../ingredients/table-columns";

export function DishesLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = dishesSearchSchema.parse(raw);
  const { layout } = useListLayout(search.layout);
  if (search.view === "ingredients")
    return (
      <ListLoading
        title={title}
        tabs={tabs}
        view={search.view}
        {...ingredientListPresentation}
        columns={ingredientTableColumns()}
        toolbar={{
          ...ingredientListPresentation.toolbar,
          layout,
          query: search.ingredients.q,
          sort: { value: search.ingredients.sort, options: ingredientSortOptions },
        }}
      />
    );
  const query = search[search.view];
  const presentation = listPresentation(search.view);
  return (
    <ListLoading
      tabs={tabs}
      view={search.view}
      {...presentation}
      columns={dishesTableColumns(search.view)}
      toolbar={{
        title,
        layout,
        searchLabel: presentation.searchLabel,
        placeholder: presentation.placeholder,
        query: query.q,
        sort: { value: query.sort, options: sortOptions },
      }}
    />
  );
}

export function DishesLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={`${title}图鉴暂时无法加载`} onRetry={onRetry} />;
}

export function DishesDetailError() {
  const router = useRouter();
  return <DishesLoadError onRetry={() => void router.invalidate()} />;
}
