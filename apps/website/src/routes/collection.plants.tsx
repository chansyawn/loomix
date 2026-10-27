import { createFileRoute, useRouter } from "@tanstack/react-router";

import { loadPlants } from "@/features/plants/data";
import { PlantsPage } from "@/features/plants/plants-page";
import { compactPlantsSearchMiddleware, plantsSearchSchema } from "@/features/plants/search";
import { PlantsLoadError, PlantsLoading } from "@/features/plants/states";

export const Route = createFileRoute("/collection/plants")({
  ssr: false,
  validateSearch: plantsSearchSchema,
  search: { middlewares: [compactPlantsSearchMiddleware] },
  loader: () => loadPlants(),
  pendingComponent: PlantsLoading,
  errorComponent: PlantsError,
  component: PlantsRoute,
});

function PlantsRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <PlantsPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: true })
      }
    />
  );
}

function PlantsError() {
  const router = useRouter();
  return <PlantsLoadError onRetry={() => void router.invalidate()} />;
}
