import { createFileRoute } from "@tanstack/react-router";
import { loadNeighborDetail } from "@/features/neighbors/detail";
import { NeighborDetailPage } from "@/features/neighbors/detail-page";
import {
  NeighborDetailLoading,
  NeighborsError,
  NeighborNotFound,
} from "@/features/neighbors/states";

export const Route = createFileRoute("/neighbors_/$id")({
  ssr: false,
  loader: ({ params }) => loadNeighborDetail(params.id),
  pendingComponent: NeighborDetailLoading,
  errorComponent: NeighborsError,
  notFoundComponent: NeighborNotFound,
  component: NeighborRoute,
});
function NeighborRoute() {
  const detail = Route.useLoaderData();
  return <NeighborDetailPage key={detail.neighbor.id} {...detail} />;
}
