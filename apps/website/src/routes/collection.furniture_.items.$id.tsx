import { createFileRoute } from "@tanstack/react-router";
import { loadFurnitureDetail } from "@/features/furniture/detail";
import {
  FurnitureDetailPage,
  FurnitureDetailLoading,
  FurnitureDetailError,
  FurnitureDetailNotFound,
} from "@/features/furniture/detail-page";

export const Route = createFileRoute("/collection/furniture_/items/$id")({
  ssr: false,
  loader: ({ params }) => loadFurnitureDetail("items", params.id),
  pendingComponent: FurnitureDetailLoading,
  errorComponent: FurnitureDetailError,
  notFoundComponent: () => <FurnitureDetailNotFound view="items" />,
  component: FurnitureItemRoute,
});

function FurnitureItemRoute() {
  return <FurnitureDetailPage detail={Route.useLoaderData()} />;
}
