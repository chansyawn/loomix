import { useRouter, useRouterState } from "@tanstack/react-router";
import { ListLoading } from "../omnidex/loading";
import { ListEmpty, ListLoadError } from "../omnidex/states";
import { useListLayout } from "../omnidex/use-list-layout";
import { dishesSearchSchema, sortOptions } from "./search";
import type { View } from "./search";
import { dishesTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";
import { ListPage } from "../omnidex/page";
import { Skeleton } from "@/ui/components/skeleton";

export function DishesLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = dishesSearchSchema.parse(raw);
  const layout = useListLayout(search.layout);
  if (search.view === "ingredients")
    return (
      <ListPage title={title} tabs={tabs} view={search.view} loading>
        <Skeleton className="mb-6 h-9 w-full max-w-sm" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-4">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-48" />
          ))}
        </div>
      </ListPage>
    );
  const query = search[search.view];
  const presentation = listPresentation(search.view);
  return (
    <ListLoading
      title={title}
      tabs={tabs}
      view={search.view}
      layout={layout}
      {...presentation}
      columns={dishesTableColumns(search.view)}
      query={query.q}
      sort={query.sort}
      sortOptions={sortOptions}
    />
  );
}

export function DishesEmpty({ onClear, view }: { onClear: () => void; view: View }) {
  return (
    <ListEmpty
      title={view === "items" ? "菜肴" : view === "ingredients" ? "食材" : "菜肴系列"}
      onClear={onClear}
    />
  );
}

export function DishesLoadError({ onRetry }: { onRetry: () => void }) {
  return <ListLoadError title={title} onRetry={onRetry} />;
}

export function DishesDetailError() {
  const router = useRouter();
  return <DishesLoadError onRetry={() => void router.invalidate()} />;
}
