import { ClothingCounterpartSwitch } from "./counterpart-switch";
import type { DetailField, DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { collectionMembers } from "../omnidex/detail-relations";
import { RecordImage } from "../omnidex/record-image";
import type { ClothingPageDetail } from "./detail";
import { HairDyeingPalette, hairDyeingSectionId } from "./hair-dyeing-palette";
import type { DetailResourceState } from "../detail-page/use-detail-resource";
import type { HairDyeingRegion } from "./hair-dyeing";

export function clothingDetailPresentation(
  detail: ClothingPageDetail,
  hairDyeing?: DetailResourceState<HairDyeingRegion[]>,
): CatalogDetailPresentation {
  const { record, navigation, counterpart } = detail;
  const fields: DetailField[] = [];
  const relatedFields: DetailField[] = [];
  const sections: DetailSection[] = [];
  if (detail.kind === "set") {
    const members = collectionMembers("clothing", detail.items, (item) => item.category);
    relatedFields.push(...members.relatedFields);
    sections.push(...members.sections);
  } else if (detail.kind === "neighborOutfit") {
    fields.push(["部位", detail.slotName], ["可用体型", detail.modelSizes]);
  }
  if (hairDyeing && (hairDyeing.status !== "ready" || hairDyeing.value.length > 0))
    sections.push({
      id: hairDyeingSectionId,
      title: "染发",
      content: <HairDyeingPalette state={hairDyeing} />,
    });
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    titleActions: counterpart && (
      <ClothingCounterpartSwitch counterpart={counterpart} currentId={record.id} />
    ),
    navigation: navigation ?? undefined,
    fields,
    relatedFields,
    classification:
      detail.kind === "item" || detail.kind === "appearance" ? detail.record.category : null,
    sections,
  };
}
