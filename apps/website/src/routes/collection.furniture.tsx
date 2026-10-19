import { createFileRoute, useRouter } from "@tanstack/react-router";

import { loadFurniture } from "@/features/furniture/data";
import { FurniturePage } from "@/features/furniture/furniture-page";
import {
  furnitureSearchSchema,
  compactFurnitureSearchMiddleware,
} from "@/features/furniture/search";
import { FurnitureLoading, FurnitureLoadError } from "@/features/furniture/states";

export const Route = createFileRoute("/collection/furniture")({
  ssr: false,
  validateSearch: furnitureSearchSchema,
  search: { middlewares: [compactFurnitureSearchMiddleware] },
  loader: () => loadFurniture(),
  pendingComponent: FurnitureLoading,
  errorComponent: FurnitureError,
  component: FurnitureRoute,
});

function FurnitureRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <FurniturePage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: false })
      }
    />
  );
}

function FurnitureError() {
  const router = useRouter();
  return <FurnitureLoadError onRetry={() => void router.invalidate()} />;
}
