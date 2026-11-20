import { ClothingCard } from "./clothing-card";
import { ClothingCounterpartSwitch } from "./counterpart-switch";
import {
  CollectionDetailLayout,
  CollectionDetailExtras,
  type CollectionDetailSection,
} from "@/features/collection/detail-layout";
import { RecordImage } from "@/features/collection/record-image";
import type { ClothingPageDetail } from "./detail";
import { CollectionDetailNavigation } from "../collection/detail-navigation";
import { formatNeighborClothingPrice } from "../neighbor-clothing/presentation";

export function ClothingDetailPage({ detail }: { detail: ClothingPageDetail }) {
  const { record, navigation, counterpart } = detail;
  const sections = clothingDetailSections(detail);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {navigation && <CollectionDetailNavigation model={navigation} currentId={record.id} />}
      <CollectionDetailLayout
        image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
        title={record.name}
        titleActions={
          counterpart && (
            <ClothingCounterpartSwitch counterpart={counterpart} currentId={record.id} />
          )
        }
        quality={record.quality}
        description={
          <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
            {record.description || "描述未提供"}
          </p>
        }
        fields={clothingDetailFields(detail)}
      >
        {sections.length > 0 && <CollectionDetailExtras sections={sections} />}
      </CollectionDetailLayout>
    </div>
  );
}

function clothingDetailFields(detail: ClothingPageDetail): [string, string | null][] {
  switch (detail.kind) {
    case "item":
      return [
        ["分类", detail.record.category],
        ["风格", detail.record.styles],
        ["颜色", detail.record.colors],
        ["材质", detail.record.materials],
        ["获取途径", detail.record.acquisition],
      ];
    case "appearance":
      return [["分类", detail.record.category]];
    case "set":
      return [
        ["套装名称", detail.record.setName],
        ["成员数量", detail.items === null ? null : `${detail.items.length} 件服装`],
      ];
    case "neighborClothing":
      return [
        ["部位", detail.slotName],
        ["友邻", detail.neighborName],
        ["可用体型", detail.modelSizes],
        ["配置价格", formatNeighborClothingPrice(detail.price)],
      ];
  }
}

function clothingDetailSections(detail: ClothingPageDetail): CollectionDetailSection[] {
  const sections: CollectionDetailSection[] = [];
  if (detail.kind === "set" && detail.items?.length)
    sections.push({
      key: "related-clothing",
      content: (
        <section aria-labelledby="related-clothing" className="space-y-4">
          <h2 id="related-clothing" className="text-lg font-semibold">
            套装成员
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
            {detail.items.map((item) => (
              <ClothingCard key={item.id} record={item} />
            ))}
          </div>
        </section>
      ),
    });
  return sections;
}
