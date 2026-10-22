import { createFileRoute } from "@tanstack/react-router";
import { loadCreaturesDetail } from "@/features/creatures/detail";
import {
  CreaturesDetailPage,
  CreaturesDetailLoading,
  CreaturesDetailError,
  CreaturesDetailNotFound,
} from "@/features/creatures/detail-page";

export const Route = createFileRoute("/collection/creatures_/items/$id")({
  ssr: false,
  loader: ({ params }) => loadCreaturesDetail("items", params.id),
  pendingComponent: CreaturesDetailLoading,
  errorComponent: CreaturesDetailError,
  notFoundComponent: () => <CreaturesDetailNotFound view="items" />,
  component: CreatureItemRoute,
});

function CreatureItemRoute() {
  return <CreaturesDetailPage detail={Route.useLoaderData()} />;
}
