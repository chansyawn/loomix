import { createFileRoute, useRouter } from "@tanstack/react-router";
import { loadCatalogOverview } from "@/features/omnidex-loader";
import { CatalogPage } from "@/features/catalog/page";
import { catalogSearchSchema, compactCatalogSearchMiddleware } from "@/features/catalog/search";
import { CatalogLoading } from "@/features/catalog/states";
import { ListLoadError } from "@/features/omnidex/states";
export const Route = createFileRoute("/catalog")({
  ssr: false,
  validateSearch: catalogSearchSchema,
  search: { middlewares: [compactCatalogSearchMiddleware] },
  loader: () => loadCatalogOverview(),
  pendingComponent: CatalogLoading,
  errorComponent: CatalogError,
  component: CatalogRoute,
});
function CatalogRoute() {
  const data = Route.useLoaderData(),
    search = Route.useSearch(),
    navigate = Route.useNavigate();
  return (
    <CatalogPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: true })
      }
    />
  );
}
function CatalogError() {
  const router = useRouter();
  return <ListLoadError title="全部" onRetry={() => void router.invalidate()} />;
}
