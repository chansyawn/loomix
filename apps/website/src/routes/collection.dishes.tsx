import { createFileRoute, useRouter } from "@tanstack/react-router";
import { loadDishes } from "@/features/dishes/data";
import { DishesPage } from "@/features/dishes/dishes-page";
import { compactDishesSearchMiddleware, dishesSearchSchema } from "@/features/dishes/search";
import { DishesLoadError, DishesLoading } from "@/features/dishes/states";

export const Route = createFileRoute("/collection/dishes")({
  ssr: false,
  validateSearch: dishesSearchSchema,
  search: { middlewares: [compactDishesSearchMiddleware] },
  loader: () => loadDishes(),
  pendingComponent: DishesLoading,
  errorComponent: DishesError,
  component: DishesRoute,
});

function DishesRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <DishesPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: false })
      }
    />
  );
}

function DishesError() {
  const router = useRouter();
  return <DishesLoadError onRetry={() => void router.invalidate()} />;
}
