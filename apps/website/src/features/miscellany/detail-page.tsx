import {
  CollectionDetailExtras,
  CollectionDetailLayout,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import { ItemCookingUsage } from "../ingredients/item-usage";
import type { MiscellanyDetail } from "./detail";
import { MiscellanyFurnitureUses, MiscellanySourceTrees } from "./related-items";

export function MiscellanyDetailPage({ detail }: { detail: MiscellanyDetail }) {
  const item = detail.record;
  return (
    <CollectionDetailLayout
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
      <MiscellanyExtras key={item.id} detail={detail} />
    </CollectionDetailLayout>
  );
}

function MiscellanyExtras({ detail }: { detail: MiscellanyDetail }) {
  const sections: CollectionDetailSection[] = [];
  if (detail.sourceTrees.length > 0)
    sections.push({
      key: "miscellany-source-trees",
      content: <MiscellanySourceTrees items={detail.sourceTrees} />,
    });
  if (detail.cooking)
    sections.push({
      key: "miscellany-cooking",
      content: <ItemCookingUsage usage={detail.cooking} />,
    });
  if (detail.furnitureUses.length > 0)
    sections.push({
      key: "miscellany-furniture",
      content: <MiscellanyFurnitureUses uses={detail.furnitureUses} />,
    });
  return <CollectionDetailExtras sections={sections} />;
}
