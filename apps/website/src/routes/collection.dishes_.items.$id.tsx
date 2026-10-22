import { createFileRoute } from "@tanstack/react-router";
import { loadDishesDetail } from "@/features/dishes/detail";
import {
  DishesDetailLoading,
  DishesDetailNotFound,
  DishesDetailPage,
  DishesDetailRouteError,
} from "@/features/dishes/detail-page";

export const Route = createFileRoute("/collection/dishes_/items/$id")({
  ssr: false,
  loader: ({ params }) => loadDishesDetail("items", params.id),
  pendingComponent: DishesDetailLoading,
  errorComponent: DishesDetailRouteError,
  notFoundComponent: () => <DishesDetailNotFound view="items" />,
  component: DishItemRoute,
});

function DishItemRoute() {
  return <DishesDetailPage detail={Route.useLoaderData()} />;
}
