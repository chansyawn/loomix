import type { DetailField, DetailSection } from "../detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { addDetailRelation } from "../omnidex/detail-relations";
import { RecordImage } from "../omnidex/record-image";
import type { MiscellaneousDetail } from "./detail";

export function miscellaneousDetailPresentation(
  detail: MiscellaneousDetail,
): CatalogDetailPresentation {
  const relatedFields: DetailField[] = [];
  const sections: DetailSection[] = [];
  addDetailRelation(
    relatedFields,
    sections,
    "来源树木",
    "miscellaneous-source-trees",
    detail.sourceTrees,
  );
  return {
    image: <RecordImage image={detail.record.image} name={detail.record.name} eager />,
    relatedFields,
    sections,
  };
}
