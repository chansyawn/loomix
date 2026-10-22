import { createFileRoute } from "@tanstack/react-router";
import { loadCreaturesDetail } from "@/features/creatures/detail";
import {
  CreaturesDetailPage,
  CreaturesDetailLoading,
  CreaturesDetailError,
  CreaturesDetailNotFound,
} from "@/features/creatures/detail-page";

export const Route = createFileRoute("/collection/creatures_/series/$id")({
  ssr: false,
  loader: ({ params }) => loadCreaturesDetail("series", params.id),
  pendingComponent: CreaturesDetailLoading,
  errorComponent: CreaturesDetailError,
  notFoundComponent: () => <CreaturesDetailNotFound view="series" />,
  component: CreatureSeriesRoute,
});

function CreatureSeriesRoute() {
  return <CreaturesDetailPage detail={Route.useLoaderData()} />;
}
