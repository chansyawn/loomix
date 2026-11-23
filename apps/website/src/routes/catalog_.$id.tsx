import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { loadOmnidexCatalog } from "@/features/omnidex-loader";
import { parseCatalogEntryId, catalogEntryDetail } from "@/features/omnidex/catalog-entry-detail";
import { CatalogEntryPage } from "@/features/omnidex/catalog-entry-page";
import { DetailLoading } from "@/features/omnidex/detail-layout";
import { ListLoadError } from "@/features/omnidex/states";
import { OmnidexReturnLink } from "@/features/omnidex/navigation";
import { createResourceReader } from "@/infrastructure/resources";
import { parseNeighbors } from "@loomix/schema/neighbors";
export const Route = createFileRoute("/catalog_/$id")({
  ssr: false,
  loader: async ({ params }) => {
    const id = parseCatalogEntryId(params.id);
    if (id === null) throw notFound();
    const load = createResourceReader();
    const data = await loadOmnidexCatalog(load);
    const row = data.byId.get(id);
    if (!row) throw notFound();
    const { record } = row;
    const neighborId =
      "kind" in record && record.kind === "neighborOutfit" ? record.neighborId : null;
    const neighborName =
      neighborId !== null
        ? (await load("neighbors", parseNeighbors)).neighbors.find(
            (neighbor) => neighbor.id === neighborId,
          )?.name
        : undefined;
    return { data, record: row, model: catalogEntryDetail(data, id, neighborName) };
  },
  pendingComponent: () => <DetailLoading label="正在加载物品详情" />,
  errorComponent: DetailError,
  notFoundComponent: () => (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">未找到已收录物品</h1>
      <OmnidexReturnLink>返回图鉴列表</OmnidexReturnLink>
    </section>
  ),
  component: DetailRoute,
});
function DetailRoute() {
  const { data, record, model } = Route.useLoaderData();
  return <CatalogEntryPage data={data} id={record.id} model={model} />;
}
function DetailError() {
  const router = useRouter();
  return <ListLoadError title="物品详情" onRetry={() => void router.invalidate()} />;
}
