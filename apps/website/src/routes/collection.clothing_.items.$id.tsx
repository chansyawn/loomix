import { createFileRoute } from "@tanstack/react-router";
import { loadClothingDetail } from "@/features/clothing/detail";
import {
  ClothingDetailPage,
  ClothingDetailLoading,
  ClothingDetailError,
  ClothingDetailNotFound,
} from "@/features/clothing/detail-page";

export const Route = createFileRoute("/collection/clothing_/items/$id")({
  ssr: false,
  loader: ({ params }) => loadClothingDetail("items", params.id),
  pendingComponent: ClothingDetailLoading,
  errorComponent: ClothingDetailError,
  notFoundComponent: () => <ClothingDetailNotFound view="items" />,
  component: ClothingItemRoute,
});

function ClothingItemRoute() {
  return <ClothingDetailPage detail={Route.useLoaderData()} />;
}
