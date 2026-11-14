import { createFileRoute, notFound, redirect, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { recordTarget, recordFocus } from "@loomix/schema/catalog";
import { loadCollectionCatalog } from "@/features/collection-loader";
import { parseRecordId, collectionDetail } from "@/features/collection/record-detail";
import { RecordDetailPage } from "@/features/collection/record-detail-page";
import { CollectionDetailLoading } from "@/features/collection/detail-layout";
import { CollectionLoadError } from "@/features/collection/states";
import { CollectionReturnLink } from "@/features/collection/navigation";
import { createResourceReader } from "@/infrastructure/resources";
import { parseNeighbors } from "@loomix/schema/neighbors";
export const Route = createFileRoute("/collections/records/$id")({
  ssr: false,
  validateSearch: z.object({
    focus: z.coerce
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional()
      .catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ focus: search.focus }),
  loader: async ({ params, deps, location }) => {
    const id = parseRecordId(params.id);
    if (id === null) throw notFound();
    const load = createResourceReader();
    const data = await loadCollectionCatalog(load);
    const target = recordTarget(data.catalog, id);
    if (!target) throw notFound();
    const focus = target.focus ?? recordFocus(data.catalog, target.recordId, deps.focus);
    if (target.recordId !== id || Reflect.get(location.search, "focus") !== focus)
      throw redirect({
        to: "/collections/records/$id",
        params: { id: String(target.recordId) },
        search: { focus },
        replace: true,
        state: location.state,
      });
    const row = data.byId.get(id);
    if (!row) throw notFound();
    const neighborId = row.record.type === "neighborClothing" ? row.record.neighborId : null;
    const neighborName =
      neighborId !== null
        ? parseNeighbors(await load("neighbors", parseNeighbors)).neighbors.find(
            (neighbor) => neighbor.id === neighborId,
          )?.name
        : undefined;
    return { data, record: row, model: collectionDetail(data, id, neighborName), focus };
  },
  pendingComponent: () => <CollectionDetailLoading label="正在加载物品详情" />,
  errorComponent: DetailError,
  notFoundComponent: () => (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">未找到已收录物品</h1>
      <CollectionReturnLink>返回收藏列表</CollectionReturnLink>
    </section>
  ),
  component: DetailRoute,
});
function DetailRoute() {
  const { data, record, model, focus } = Route.useLoaderData(),
    navigate = Route.useNavigate();
  return (
    <RecordDetailPage
      data={data}
      id={record.id}
      model={model}
      focus={focus}
      onFocusChange={(focus) =>
        void navigate({ search: { focus }, state: (previous) => previous, resetScroll: false })
      }
    />
  );
}
function DetailError() {
  const router = useRouter();
  return <CollectionLoadError title="物品详情" onRetry={() => void router.invalidate()} />;
}
