import { DetailExtras, DetailLayout, type DetailSection } from "@/features/omnidex/detail-layout";
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
    >
      <MiscellaneousExtras key={item.id} detail={detail} />
    </DetailLayout>
  );
}

function MiscellaneousExtras({ detail }: { detail: MiscellaneousDetail }) {
  const sections: DetailSection[] = [];
  if (detail.sourceTrees.length > 0)
    sections.push({
      key: "miscellaneous-source-trees",
      content: <MiscellaneousSourceTrees items={detail.sourceTrees} />,
    });
  if (detail.cooking)
    sections.push({
      key: "miscellaneous-cooking",
      content: <ItemIngredientTags tags={detail.cooking.tags} />,
    });
  return <DetailExtras sections={sections} />;
}
