import { DetailLayout, type DetailSection } from "@/features/omnidex/detail-layout";
import { RecordImage } from "@/features/omnidex/record-image";
import { ItemIngredientTags } from "../ingredients/item-usage";
import type { MiscellaneousDetail } from "./detail";
import { MiscellaneousSourceTrees } from "./related-items";

export function MiscellaneousDetailPage({ detail }: { detail: MiscellaneousDetail }) {
  const item = detail.record;
  return (
    <DetailLayout
      image={<RecordImage key={item.image} image={item.image} name={item.name} eager />}
      title={item.name}
      quality={item.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {item.description || "描述未提供"}
        </p>
      }
      fields={[["获取来源", item.acquisition]]}
      sections={miscellaneousDetailSections(detail)}
      showEmptyExtras
    />
  );
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
