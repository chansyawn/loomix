import { createFileRoute, useRouter } from "@tanstack/react-router";
import { loadCollectionCatalog } from "@/features/collection-loader";
import { AllPage } from "@/features/all/page";
import { allSearchSchema, compactAllSearchMiddleware } from "@/features/all/search";
import { AllLoading } from "@/features/all/states";
import { CollectionLoadError } from "@/features/collection/states";
export const Route = createFileRoute("/collections/all")({
  ssr: false,
  validateSearch: allSearchSchema,
  search: { middlewares: [compactAllSearchMiddleware] },
  loader: () => loadCollectionCatalog(),
  pendingComponent: AllLoading,
  errorComponent: AllError,
  component: AllRoute,
});
function AllRoute() {
  const data = Route.useLoaderData(),
    search = Route.useSearch(),
    navigate = Route.useNavigate();
  return (
    <AllPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: true })
      }
    />
  );
}
function AllError() {
  const router = useRouter();
  return <CollectionLoadError title="全部" onRetry={() => void router.invalidate()} />;
}
