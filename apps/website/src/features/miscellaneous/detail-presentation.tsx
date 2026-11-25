import type { DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "@/features/omnidex/record-image";
import { ItemIngredientTags } from "../ingredients/item-usage";
import type { MiscellaneousDetail } from "./detail";
import { MiscellaneousSourceTrees } from "./related-items";

export function miscellaneousDetailPresentation(
  detail: MiscellaneousDetail,
): CatalogDetailPresentation {
  const item = detail.record;
  return {
    image: <RecordImage key={item.image} image={item.image} name={item.name} eager />,
    description: (
      <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
        {item.description || "描述未提供"}
      </p>
    ),
    fields: [],
    sections: miscellaneousDetailSections(detail),
    showEmptyExtras: true,
  };
}

function miscellaneousDetailSections(detail: MiscellaneousDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.sourceTrees.length > 0)
    sections.push({
      id: "miscellaneous-source-trees",
      title: "来源树木",
      content: <MiscellaneousSourceTrees items={detail.sourceTrees} />,
    });
  if (detail.cooking)
    sections.push({
      id: "item-ingredient-tags",
      title: "食材标签",
      content: <ItemIngredientTags tags={detail.cooking.tags} />,
    });
  return sections;
}
