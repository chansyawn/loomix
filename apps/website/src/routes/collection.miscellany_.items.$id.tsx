import { createFileRoute } from "@tanstack/react-router";
import { loadMiscellanyDetail } from "@/features/miscellany/detail";
import {
  MiscellanyDetailError,
  MiscellanyDetailLoading,
  MiscellanyDetailNotFound,
  MiscellanyDetailPage,
} from "@/features/miscellany/detail-page";

export const Route = createFileRoute("/collection/miscellany_/items/$id")({
  ssr: false,
  loader: ({ params }) => loadMiscellanyDetail(params.id),
  pendingComponent: MiscellanyDetailLoading,
  errorComponent: MiscellanyDetailError,
  notFoundComponent: MiscellanyDetailNotFound,
  component: MiscellanyItemRoute,
});

function MiscellanyItemRoute() {
  return <MiscellanyDetailPage item={Route.useLoaderData()} />;
}
