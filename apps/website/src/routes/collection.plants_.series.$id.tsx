import { createFileRoute } from "@tanstack/react-router";
import { loadPlantsDetail } from "@/features/plants/detail";
import {
  PlantsDetailError,
  PlantsDetailLoading,
  PlantsDetailNotFound,
  PlantsDetailPage,
} from "@/features/plants/detail-page";

export const Route = createFileRoute("/collection/plants_/series/$id")({
  ssr: false,
  loader: ({ params }) => loadPlantsDetail("series", params.id),
  pendingComponent: PlantsDetailLoading,
  errorComponent: PlantsDetailError,
  notFoundComponent: () => <PlantsDetailNotFound view="series" />,
  component: PlantSeriesRoute,
});

function PlantSeriesRoute() {
  return <PlantsDetailPage detail={Route.useLoaderData()} />;
}
