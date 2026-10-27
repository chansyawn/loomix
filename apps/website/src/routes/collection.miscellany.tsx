import { createFileRoute, useRouter } from "@tanstack/react-router";
import { loadMiscellany } from "@/features/miscellany/data";
import { MiscellanyPage } from "@/features/miscellany/miscellany-page";
import {
  compactMiscellanySearchMiddleware,
  miscellanySearchSchema,
} from "@/features/miscellany/search";
import { MiscellanyLoadError, MiscellanyLoading } from "@/features/miscellany/states";

export const Route = createFileRoute("/collection/miscellany")({
  ssr: false,
  validateSearch: miscellanySearchSchema,
  search: { middlewares: [compactMiscellanySearchMiddleware] },
  loader: () => loadMiscellany(),
  pendingComponent: MiscellanyLoading,
  errorComponent: MiscellanyError,
  component: MiscellanyRoute,
});

function MiscellanyRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <MiscellanyPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: true })
      }
    />
  );
}

function MiscellanyError() {
  const router = useRouter();
  return <MiscellanyLoadError onRetry={() => void router.invalidate()} />;
}
