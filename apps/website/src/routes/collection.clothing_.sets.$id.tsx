import { createFileRoute } from "@tanstack/react-router";
import { loadClothingDetail } from "@/features/clothing/detail";
import {
  ClothingDetailPage,
  ClothingDetailLoading,
  ClothingDetailError,
  ClothingDetailNotFound,
} from "@/features/clothing/detail-page";

export const Route = createFileRoute("/collection/clothing_/sets/$id")({
  ssr: false,
  loader: ({ params }) => loadClothingDetail("sets", params.id),
  pendingComponent: ClothingDetailLoading,
  errorComponent: ClothingDetailError,
  notFoundComponent: () => <ClothingDetailNotFound view="sets" />,
  component: ClothingSetRoute,
});

function ClothingSetRoute() {
  return <ClothingDetailPage detail={Route.useLoaderData()} />;
}
