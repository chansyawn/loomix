import { createFileRoute } from "@tanstack/react-router";
import { loadFurnitureDetail } from "@/features/furniture/detail";
import {
  FurnitureDetailPage,
  FurnitureDetailLoading,
  FurnitureDetailError,
  FurnitureDetailNotFound,
} from "@/features/furniture/detail-page";

export const Route = createFileRoute("/collection/furniture_/sets/$id")({
  ssr: false,
  loader: ({ params }) => loadFurnitureDetail("sets", params.id),
  pendingComponent: FurnitureDetailLoading,
  errorComponent: FurnitureDetailError,
  notFoundComponent: () => <FurnitureDetailNotFound view="sets" />,
  component: FurnitureSetRoute,
});

function FurnitureSetRoute() {
  return <FurnitureDetailPage detail={Route.useLoaderData()} />;
}
