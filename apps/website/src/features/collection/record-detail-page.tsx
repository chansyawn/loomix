import type { CollectionCatalog } from "./catalog";
import type { RecordDetail } from "./record-detail";
import { RecordDetailContext } from "./record-context";
import { FurnitureDetailPage } from "../furniture/detail-page";
import { ClothingDetailPage } from "../clothing/detail-page";
import { CreaturesDetailPage } from "../creatures/detail-page";
import { PlantsDetailPage } from "../plants/detail-page";
import { DishesDetailPage } from "../dishes/detail-page";
import { MiscellanyDetailPage } from "../miscellany/detail-page";

export function RecordDetailPage({
  data,
  id,
  focus,
  model,
  onFocusChange,
}: {
  data: CollectionCatalog;
  id: number;
  focus?: number;
  model: RecordDetail;
  onFocusChange: (focus?: number) => void;
}) {
  const selectedFocus =
    focus ??
    (model.category === "plants" && model.detail.kind === "crop"
      ? model.detail.seeds[0]?.id
      : undefined);
  return (
    <RecordDetailContext
      value={{
        record: data.byId.get(id)!,
        focus: selectedFocus === undefined ? undefined : data.byId.get(selectedFocus),
      }}
    >
      <DetailContent model={model} focus={focus} onFocusChange={onFocusChange} />
    </RecordDetailContext>
  );
}
function DetailContent({
  model,
  focus,
  onFocusChange,
}: {
  model: RecordDetail;
  focus?: number;
  onFocusChange: (focus?: number) => void;
}) {
  switch (model.category) {
    case "furniture":
      return <FurnitureDetailPage detail={model.detail} />;
    case "clothing":
      return <ClothingDetailPage detail={model.detail} />;
    case "creatures":
      return <CreaturesDetailPage detail={model.detail} />;
    case "plants":
      return <PlantsDetailPage detail={model.detail} focus={focus} onFocusChange={onFocusChange} />;
    case "dishes":
      return <DishesDetailPage detail={model.detail} />;
    case "miscellaneous":
      return <MiscellanyDetailPage detail={model.detail} />;
  }
}
