import { createFileRoute, useRouter } from "@tanstack/react-router";

import { loadCreatures } from "@/features/creatures/data";
import { CreaturesPage } from "@/features/creatures/creatures-page";
import {
  creaturesSearchSchema,
  compactCreaturesSearchMiddleware,
} from "@/features/creatures/search";
import { CreaturesLoading, CreaturesLoadError } from "@/features/creatures/states";

export const Route = createFileRoute("/collection/creatures")({
  ssr: false,
  validateSearch: creaturesSearchSchema,
  search: { middlewares: [compactCreaturesSearchMiddleware] },
  loader: () => loadCreatures(),
  pendingComponent: CreaturesLoading,
  errorComponent: CreaturesError,
  component: CreaturesRoute,
});

function CreaturesRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CreaturesPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: false })
      }
    />
  );
}

function CreaturesError() {
  const router = useRouter();
  return <CreaturesLoadError onRetry={() => void router.invalidate()} />;
}
