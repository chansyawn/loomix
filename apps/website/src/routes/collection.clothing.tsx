import { createFileRoute, useRouter } from "@tanstack/react-router";

import { loadClothing } from "@/features/clothing/data";
import { ClothingPage } from "@/features/clothing/clothing-page";
import { clothingSearchSchema, compactClothingSearchMiddleware } from "@/features/clothing/search";
import { ClothingLoading, ClothingLoadError } from "@/features/clothing/states";

export const Route = createFileRoute("/collection/clothing")({
  ssr: false,
  validateSearch: clothingSearchSchema,
  search: { middlewares: [compactClothingSearchMiddleware] },
  loader: () => loadClothing(),
  pendingComponent: ClothingLoading,
  errorComponent: ClothingError,
  component: ClothingRoute,
});

function ClothingRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ClothingPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: false })
      }
    />
  );
}

function ClothingError() {
  const router = useRouter();
  return <ClothingLoadError onRetry={() => void router.invalidate()} />;
}
