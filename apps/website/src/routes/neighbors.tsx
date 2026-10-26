import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { loadNeighbors } from "@/features/neighbors/data";
import { NeighborsPage } from "@/features/neighbors/list-page";
import { neighborsSearchSchema } from "@/features/neighbors/search";
import { NeighborsLoading, NeighborsError } from "@/features/neighbors/states";

export const Route = createFileRoute("/neighbors")({
  ssr: false,
  validateSearch: neighborsSearchSchema,
  search: { middlewares: [stripSearchParams({ q: "", galaxy: "" })] },
  loader: () => loadNeighbors(),
  pendingComponent: NeighborsLoading,
  errorComponent: NeighborsError,
  component: NeighborsRoute,
});
function NeighborsRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <NeighborsPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: false })
      }
    />
  );
}
