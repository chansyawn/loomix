import { createFileRoute } from "@tanstack/react-router";
import { loadNeighborDetail } from "@/features/neighbors/detail";
import { NeighborDetailPage } from "@/features/neighbors/detail-page";
import { NeighborsLoading, NeighborsError, NeighborNotFound } from "@/features/neighbors/states";

export const Route = createFileRoute("/neighbors_/$id")({
  ssr: false,
  loader: ({ params }) => loadNeighborDetail(params.id),
  pendingComponent: NeighborsLoading,
  errorComponent: NeighborsError,
  notFoundComponent: NeighborNotFound,
  component: NeighborRoute,
});
function NeighborRoute() {
  return <NeighborDetailPage neighbor={Route.useLoaderData()} />;
}
