import { createFileRoute } from "@tanstack/react-router";
import { loadPlantsDetail } from "@/features/plants/detail";
import {
  PlantsDetailError,
  PlantsDetailLoading,
  PlantsDetailNotFound,
  PlantsDetailPage,
} from "@/features/plants/detail-page";

export const Route = createFileRoute("/collection/plants_/seeds/$id")({
  ssr: false,
  loader: ({ params }) => loadPlantsDetail("seeds", params.id),
  pendingComponent: PlantsDetailLoading,
  errorComponent: PlantsDetailError,
  notFoundComponent: () => <PlantsDetailNotFound view="seeds" />,
  component: PlantSeedRoute,
});

function PlantSeedRoute() {
  return <PlantsDetailPage detail={Route.useLoaderData()} />;
}
