import { ClothingCard } from "./clothing-card";
import { ClothingCounterpartSwitch } from "./counterpart-switch";
import { DetailLayout, type DetailSection } from "@/features/omnidex/detail-layout";
import { RecordImage } from "@/features/omnidex/record-image";
import type { ClothingPageDetail } from "./detail";
import { CatalogEntryNavigation } from "../omnidex/detail-navigation";
import { formatNeighborOutfitPrice } from "../neighbor-outfit/presentation";

export function ClothingDetailPage({ detail }: { detail: ClothingPageDetail }) {
  const { record, navigation, counterpart } = detail;
  return (
    <DetailLayout
      image={<RecordImage key={record.image} image={record.image} name={record.name} eager />}
      title={record.name}
      titleActions={
        counterpart && <ClothingCounterpartSwitch counterpart={counterpart} currentId={record.id} />
      }
      quality={record.quality}
      description={
        <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
          {record.description || "描述未提供"}
        </p>
      }
      fields={clothingDetailFields(detail)}
      navigation={navigation && <CatalogEntryNavigation model={navigation} currentId={record.id} />}
      sections={clothingDetailSections(detail)}
    />
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
        ["套装名称", detail.record.outfitName],
        ["成员数量", detail.items === null ? null : `${detail.items.length} 件服装`],
      ];
    case "neighborOutfit":
      return [
        ["部位", detail.slotName],
        ["友邻", detail.neighborName],
        ["可用体型", detail.modelSizes],
        ["配置价格", formatNeighborOutfitPrice(detail.price)],
      ];
  }
}

function clothingDetailSections(detail: ClothingPageDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.kind === "set" && detail.items?.length)
    sections.push({
      id: "related-clothing",
      title: "套装成员",
      content: (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
          {detail.items.map((item) => (
            <ClothingCard key={item.id} record={item} />
          ))}
        </div>
      ),
    });
  return sections;
}
