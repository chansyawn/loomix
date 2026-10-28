import { useRouter, useRouterState } from "@tanstack/react-router";
import { CollectionLoading } from "../collection/loading";
import { CollectionEmpty, CollectionLoadError } from "../collection/states";
import { useCollectionLayout } from "../collection/use-collection-layout";
import { dishesSearchSchema, sortOptions } from "./search";
import type { View } from "./search";
import { dishesTableColumns } from "./table-columns";
import { title, tabs, listPresentation } from "./list-presentation";
import { CollectionPage } from "../collection/page";
import { Skeleton } from "@/ui/components/skeleton";

export function DishesLoading() {
  const raw = useRouterState({ select: (state) => state.location.search });
  const search = dishesSearchSchema.parse(raw);
  const layout = useCollectionLayout(search.layout);
  if (search.view === "ingredients")
    return (
      <CollectionPage title={title} tabs={tabs} view={search.view} loading>
        <Skeleton className="mb-6 h-9 w-full max-w-sm" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-4">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      </CollectionPage>
    );
  const query = search[search.view];
  const presentation = listPresentation(search.view);
  return (
    <CollectionLoading
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
    <CollectionEmpty
      title={view === "items" ? "菜肴" : view === "ingredients" ? "食材" : "菜肴系列"}
      onClear={onClear}
    />
  );
}

export function DishesLoadError({ onRetry }: { onRetry: () => void }) {
  return <CollectionLoadError title={title} onRetry={onRetry} />;
}

export function DishesDetailError() {
  const router = useRouter();
  return <DishesLoadError onRetry={() => void router.invalidate()} />;
}
