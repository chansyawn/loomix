import { createFileRoute } from "@tanstack/react-router";
import { loadStarseaDetail } from "@/features/starsea/data";
import { StarseaDetailPage } from "@/features/starsea/detail-page";
import { StarseaDetailLoading, StarseaError, StarseaNotFound } from "@/features/starsea/states";

export const Route = createFileRoute("/starsea_/islets/$id")({
  ssr: false,
  loader: ({ params }) => loadStarseaDetail(params.id),
  pendingComponent: StarseaDetailLoading,
  errorComponent: StarseaError,
  notFoundComponent: StarseaNotFound,
  component: StarseaRoute,
});

function StarseaRoute() {
  const islet = Route.useLoaderData();
  return <StarseaDetailPage key={islet.id} islet={islet} />;
}
