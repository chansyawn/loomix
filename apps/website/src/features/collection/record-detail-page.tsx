import type { CollectionCatalog } from "./catalog";
import type { RecordDetail } from "./record-detail";
import { RecordDetailContext } from "./record-context";
import { FurnitureDetailPage } from "../furniture/detail-page";
import { ClothingDetailPage } from "../clothing/detail-page";
import { CreaturesDetailPage } from "../creatures/detail-page";
import { PlantsDetailPage } from "../plants/detail-page";
import { DishesDetailPage } from "../dishes/detail-page";
import { MiscellanyDetailPage } from "../miscellany/detail-page";
import { NeighborClothingDetailPage } from "../neighbor-clothing/detail-page";

export function RecordDetailPage({
  data,
  id,
  model,
}: {
  data: CollectionCatalog;
  id: number;
  model: RecordDetail;
}) {
  return (
    <RecordDetailContext
      value={{
        record: data.byId.get(id)!,
      }}
    >
      <DetailContent model={model} />
    </RecordDetailContext>
  );
}
function DetailContent({ model }: { model: RecordDetail }) {
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
      return <MiscellanyDetailPage detail={model.detail} />;
    case "neighborClothing":
      return <NeighborClothingDetailPage detail={model.detail} />;
  }
}
