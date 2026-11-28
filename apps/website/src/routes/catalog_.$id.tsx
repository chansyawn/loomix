import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { loadCatalogOverview } from "@/features/omnidex-loader";
import { entryOverview } from "@/features/omnidex/entry-overview";
import { parseCatalogEntryId, catalogEntryDetail } from "@/features/omnidex/catalog-entry-detail";
import { CatalogEntryPage } from "@/features/omnidex/catalog-entry-page";
import { DetailPageLoading } from "@/features/detail-page/detail-page";
import { PageNotFound } from "@/features/layout/page-not-found";
import { ListLoadError } from "@/features/list-page/states";
import { OmnidexReturnLink } from "@/features/omnidex/navigation";
import { createResourceReader } from "@/infrastructure/resources";
import { readOutfitNeighbor } from "@/features/neighbor-outfit/detail";
import { catalogGameplayUses } from "@/features/omnidex/gameplay-uses-model";
import { itemRelationReaders } from "@/features/omnidex/item-relations";
import { hairstylePalette, readHairDyeingData } from "@/features/clothing/hair-dyeing";
import { Button } from "@/ui/components/button";
export const Route = createFileRoute("/catalog_/$id")({
  ssr: false,
  loader: async ({ params }) => {
    const id = parseCatalogEntryId(params.id);
    if (id === null) throw notFound();
    const load = createResourceReader();
    const data = await loadCatalogOverview(load);
    const row = data.byId.get(id);
    if (!row) throw notFound();
    const { record } = row;
    const neighborId =
      "kind" in record && record.kind === "neighborOutfit" ? record.neighborId : null;
    const model = catalogEntryDetail(data, id);
    const overview = entryOverview(data, row);
    if (!("kind" in record)) return { record: row, model, overview };
    return {
      record: row,
      model,
      overview,
      readOwner:
        neighborId === null ? undefined : () => readOutfitNeighbor(load, neighborId, data.image),
      quotes: data.view.purchaseQuotes.get(id),
      uses: catalogGameplayUses(data, id),
      relations: itemRelationReaders(load, data, record),
      readHairDyeing:
        record.kind === "appearance" && record.category === "发型"
          ? async () =>
              hairstylePalette(
                await readHairDyeingData(load),
                id,
                data.image,
                data.view.ingredientItemsById,
              )
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
  const { record, model, overview, uses, quotes, readOwner, relations, readHairDyeing } =
    Route.useLoaderData();
  return (
    <CatalogEntryPage
      key={record.id}
      record={record}
      model={model}
      overview={overview}
      readOwner={readOwner}
      quotes={quotes}
      uses={uses}
      relations={relations}
      readHairDyeing={readHairDyeing}
    />
  );
}
function DetailError() {
  const router = useRouter();
  return <ListLoadError title="物品详情暂时无法加载" onRetry={() => void router.invalidate()} />;
}
