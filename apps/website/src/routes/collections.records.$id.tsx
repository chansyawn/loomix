import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
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
  loader: async ({ params }) => {
    const id = parseRecordId(params.id);
    if (id === null) throw notFound();
    const load = createResourceReader();
    const data = await loadCollectionCatalog(load);
    const row = data.byId.get(id);
    if (!row) throw notFound();
    const neighborId = row.record.kind === "neighborClothing" ? row.record.neighborId : null;
    const neighborName =
      neighborId !== null
        ? parseNeighbors(await load("neighbors", parseNeighbors)).neighbors.find(
            (neighbor) => neighbor.id === neighborId,
          )?.name
        : undefined;
    return { data, record: row, model: collectionDetail(data, id, neighborName) };
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
  const { data, record, model } = Route.useLoaderData();
  return <RecordDetailPage data={data} id={record.id} model={model} />;
}
function DetailError() {
  const router = useRouter();
  return <CollectionLoadError title="物品详情" onRetry={() => void router.invalidate()} />;
}
