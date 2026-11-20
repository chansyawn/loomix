import { createFileRoute, stripSearchParams, useRouterState } from "@tanstack/react-router";
import { loadStarseaList } from "@/features/starsea/data";
import { StarseaListPage } from "@/features/starsea/list-page";
import {
  resolveStarseaSearch,
  starseaSearchDefaults,
  starseaSearchSchema,
} from "@/features/starsea/search";
import { StarseaError, StarseaListLoading } from "@/features/starsea/states";

export const Route = createFileRoute("/starsea")({
  ssr: false,
  validateSearch: starseaSearchSchema,
  search: { middlewares: [stripSearchParams(starseaSearchDefaults)] },
  loader: () => loadStarseaList(),
  pendingComponent: StarseaListLoading,
  errorComponent: StarseaError,
  component: StarseaRoute,
});

function StarseaRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const historyIndex = useRouterState({ select: (state) => state.location.state.__TSR_index });
  return (
    <StarseaListPage
      data={data}
      search={resolveStarseaSearch(data.regions, search)}
      historyIndex={historyIndex}
      onChange={(patch, replace) =>
        void navigate({
          search: (previous) => ({ ...resolveStarseaSearch(data.regions, previous), ...patch }),
          replace,
          resetScroll: false,
        })
      }
    />
  );
}
