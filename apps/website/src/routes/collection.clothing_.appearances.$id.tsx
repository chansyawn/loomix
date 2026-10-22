import { createFileRoute } from "@tanstack/react-router";
import { loadClothingDetail } from "@/features/clothing/detail";
import {
  ClothingDetailPage,
  ClothingDetailLoading,
  ClothingDetailError,
  ClothingDetailNotFound,
} from "@/features/clothing/detail-page";

export const Route = createFileRoute("/collection/clothing_/appearances/$id")({
  ssr: false,
  loader: ({ params }) => loadClothingDetail("appearances", params.id),
  pendingComponent: ClothingDetailLoading,
  errorComponent: ClothingDetailError,
  notFoundComponent: () => <ClothingDetailNotFound view="appearances" />,
  component: ClothingAppearanceRoute,
});

function ClothingAppearanceRoute() {
  return <ClothingDetailPage detail={Route.useLoaderData()} />;
}
