import type { OmnidexCatalog } from "./catalog";
import type { CatalogEntryDetail } from "./catalog-entry-detail";
import { CatalogEntryContext } from "./catalog-entry-context";
import { FurnitureDetailPage } from "../furniture/detail-page";
import { ClothingDetailPage } from "../clothing/detail-page";
import { CreaturesDetailPage } from "../creatures/detail-page";
import { PlantsDetailPage } from "../plants/detail-page";
import { DishesDetailPage } from "../dishes/detail-page";
import { MiscellaneousDetailPage } from "../miscellaneous/detail-page";

export function CatalogEntryPage({
  data,
  id,
  model,
}: {
  data: OmnidexCatalog;
  id: number;
  model: CatalogEntryDetail;
}) {
  return (
    <CatalogEntryContext
      value={{
        record: data.byId.get(id)!,
      }}
    >
      <DetailContent model={model} />
    </CatalogEntryContext>
  );
}
function DetailContent({ model }: { model: CatalogEntryDetail }) {
  switch (model.category) {
    case "furniture":
      return <FurnitureDetailPage detail={model.detail} />;
    case "clothing":
      return <ClothingDetailPage detail={model.detail} />;
    case "creatures":
      return <CreaturesDetailPage detail={model.detail} />;
    case "plants":
      return <PlantsDetailPage detail={model.detail} />;
    case "dishes":
      return <DishesDetailPage detail={model.detail} />;
    case "miscellaneous":
      return <MiscellaneousDetailPage detail={model.detail} />;
  }
}
