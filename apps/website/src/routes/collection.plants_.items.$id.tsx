import { createFileRoute } from "@tanstack/react-router";
import { loadPlantsDetail } from "@/features/plants/detail";
import {
  PlantsDetailError,
  PlantsDetailLoading,
  PlantsDetailNotFound,
  PlantsDetailPage,
} from "@/features/plants/detail-page";

export const Route = createFileRoute("/collection/plants_/items/$id")({
  ssr: false,
  loader: ({ params }) => loadPlantsDetail("items", params.id),
  pendingComponent: PlantsDetailLoading,
  errorComponent: PlantsDetailError,
  notFoundComponent: () => <PlantsDetailNotFound view="items" />,
  component: PlantItemRoute,
});

function PlantItemRoute() {
  return <PlantsDetailPage detail={Route.useLoaderData()} />;
}
