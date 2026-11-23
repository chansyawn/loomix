import { createFileRoute, useRouter } from "@tanstack/react-router";
import { loadMiscellaneous } from "@/features/miscellaneous/data";
import { MiscellaneousPage } from "@/features/miscellaneous/miscellaneous-page";
import {
  compactMiscellaneousSearchMiddleware,
  miscellaneousSearchSchema,
} from "@/features/miscellaneous/search";
import { MiscellaneousLoadError, MiscellaneousLoading } from "@/features/miscellaneous/states";

export const Route = createFileRoute("/miscellaneous")({
  ssr: false,
  validateSearch: miscellaneousSearchSchema,
  search: { middlewares: [compactMiscellaneousSearchMiddleware] },
  loader: () => loadMiscellaneous(),
  pendingComponent: MiscellaneousLoading,
  errorComponent: MiscellaneousError,
  component: MiscellaneousRoute,
});

function MiscellaneousRoute() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <MiscellaneousPage
      data={data}
      search={search}
      onSearchChange={(update, replace = false) =>
        navigate({ search: update, replace, resetScroll: true })
      }
    />
  );
}

function MiscellaneousError() {
  const router = useRouter();
  return <MiscellaneousLoadError onRetry={() => void router.invalidate()} />;
}
