import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { loadVignetteList } from "@/features/vignettes/data";
import { VignetteListPage } from "@/features/vignettes/list-page";
import { vignetteSearchMiddleware, vignetteSearchSchema } from "@/features/vignettes/search";
import { VignetteError, VignetteListLoading } from "@/features/vignettes/states";

export const Route = createFileRoute("/vignettes")({
  ssr: false,
  validateSearch: vignetteSearchSchema,
  search: { middlewares: [vignetteSearchMiddleware] },
  loader: () => loadVignetteList(),
  pendingComponent: VignetteListLoading,
  errorComponent: VignetteError,
  component: VignettesRoute,
});

function VignettesRoute() {
  const navigate = Route.useNavigate();
  const historyIndex = useRouterState({ select: (state) => state.location.state.__TSR_index });
  return (
    <VignetteListPage
      entries={Route.useLoaderData()}
      search={Route.useSearch()}
      historyIndex={historyIndex}
      onChange={(patch, replace) =>
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace,
          resetScroll: false,
        })
      }
    />
  );
}
