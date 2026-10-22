import { createFileRoute } from "@tanstack/react-router";
import { loadDishesDetail } from "@/features/dishes/detail";
import {
  DishesDetailLoading,
  DishesDetailNotFound,
  DishesDetailPage,
  DishesDetailRouteError,
} from "@/features/dishes/detail-page";

export const Route = createFileRoute("/collection/dishes_/series/$id")({
  ssr: false,
  loader: ({ params }) => loadDishesDetail("series", params.id),
  pendingComponent: DishesDetailLoading,
  errorComponent: DishesDetailRouteError,
  notFoundComponent: () => <DishesDetailNotFound view="series" />,
  component: DishSeriesRoute,
});

function DishSeriesRoute() {
  return <DishesDetailPage detail={Route.useLoaderData()} />;
}
