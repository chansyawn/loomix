import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { loadOmnidexCatalog } from "@/features/omnidex-loader";
import { parseCatalogEntryId, catalogEntryDetail } from "@/features/omnidex/catalog-entry-detail";
import { CatalogEntryPage } from "@/features/omnidex/catalog-entry-page";
import { DetailPageLoading } from "@/features/detail-page/detail-page";
import { PageNotFound } from "@/features/layout/page-not-found";
import { ListLoadError } from "@/features/list-page/states";
import { OmnidexReturnLink } from "@/features/omnidex/navigation";
import { createResourceReader } from "@/infrastructure/resources";
import { parseNeighbors } from "@loomix/schema/neighbors";
import { catalogGameplayUses, vignetteGameplayUses } from "@/features/omnidex/gameplay-uses-model";
import { readVignetteTemplates } from "@/features/vignettes/data";
import { readHairstylePalette } from "@/features/clothing/hair-dyeing";
import { Button } from "@/ui/components/button";
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
    const model = catalogEntryDetail(data, id, neighborName);
    if (!("kind" in record)) return { record: row, model };
    return {
      record: row,
      model,
      quotes: data.view.purchaseQuotes.get(id),
      uses: catalogGameplayUses(data, id),
      readVignetteUses: async () =>
        vignetteGameplayUses(data, record, await readVignetteTemplates(load)),
      readHairDyeing:
        record.kind === "appearance" && record.category === "发型"
          ? () => readHairstylePalette(load, id, data.image)
          : undefined,
    };
  },
  pendingComponent: () => <DetailPageLoading label="正在加载物品详情" />,
  errorComponent: DetailError,
  notFoundComponent: () => (
    <PageNotFound
      title="未找到已收录物品"
      action={
        <Button variant="outline" nativeButton={false} render={<OmnidexReturnLink />}>
          返回图鉴列表
        </Button>
      }
    />
  ),
  component: DetailRoute,
});
function DetailRoute() {
  const { record, model, uses, quotes, readVignetteUses, readHairDyeing } = Route.useLoaderData();
  return (
    <CatalogEntryPage
      key={record.id}
      record={record}
      model={model}
      quotes={quotes}
      uses={uses}
      readVignetteUses={readVignetteUses}
      readHairDyeing={readHairDyeing}
    />
  );
}
function DetailError() {
  const router = useRouter();
  return <ListLoadError title="物品详情暂时无法加载" onRetry={() => void router.invalidate()} />;
}
