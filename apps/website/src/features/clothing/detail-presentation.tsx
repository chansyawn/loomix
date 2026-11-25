import { ClothingCard } from "./clothing-card";
import { ClothingCounterpartSwitch } from "./counterpart-switch";
import type { DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage } from "@/features/omnidex/record-image";
import type { ClothingPageDetail } from "./detail";
import { formatNeighborOutfitPrice } from "../neighbor-outfit/presentation";

export function clothingDetailPresentation(detail: ClothingPageDetail): CatalogDetailPresentation {
  const { record, navigation, counterpart } = detail;
  return {
    image: <RecordImage key={record.image} image={record.image} name={record.name} eager />,
    titleActions: counterpart && (
      <ClothingCounterpartSwitch counterpart={counterpart} currentId={record.id} />
    ),
    description: (
      <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
        {record.description || "描述未提供"}
      </p>
    ),
    fields: clothingDetailFields(detail),
    navigation: navigation ?? undefined,
    sections: clothingDetailSections(detail),
  };
}

function clothingDetailFields(detail: ClothingPageDetail): [string, string | null][] {
  switch (detail.kind) {
    case "item":
      return [
        ["分类", detail.record.category],
        ["风格", detail.record.styles],
        ["颜色", detail.record.colors],
        ["材质", detail.record.materials],
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
