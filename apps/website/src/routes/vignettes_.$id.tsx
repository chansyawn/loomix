import { createFileRoute } from "@tanstack/react-router";
import { loadVignetteDetail } from "@/features/vignettes/data";
import { VignetteDetailPage } from "@/features/vignettes/detail-page";
import {
  VignetteDetailLoading,
  VignetteError,
  VignetteNotFound,
} from "@/features/vignettes/states";

export const Route = createFileRoute("/vignettes_/$id")({
  ssr: false,
  loader: ({ params }) => loadVignetteDetail(params.id),
  pendingComponent: VignetteDetailLoading,
  errorComponent: VignetteError,
  notFoundComponent: VignetteNotFound,
  component: VignetteRoute,
});

function VignetteRoute() {
  return <VignetteDetailPage entry={Route.useLoaderData()} />;
}
