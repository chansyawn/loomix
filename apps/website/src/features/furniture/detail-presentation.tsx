import { FurnitureCard } from "./furniture-card";
import type { DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage as FurnitureImage } from "@/features/omnidex/record-image";
import type { FurnitureItem } from "../omnidex-view";
import type { FurnitureDetail } from "./detail";
import { FurnitureRecipes } from "./recipes";

export function furnitureDetailPresentation(detail: FurnitureDetail): CatalogDetailPresentation {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["类型", detail.record.furnitureCategory],
          ["尺寸", detail.record.size],
          ["颜色", detail.record.colors],
          ["材质", detail.record.materials],
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 件家具`],
        ];
  return {
    image: (
      <FurnitureImage
        key={record.image}
        image={record.image}
        name={record.name}
        fit={detail.kind === "set" ? "cover" : "contain"}
        inset={detail.kind === "set" ? "none" : "lg"}
        className={detail.kind === "set" ? "aspect-2/1" : undefined}
        eager
      />
    ),
    description: (
      <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
        {record.description || "描述未提供"}
      </p>
    ),
    fields,
    navigation: detail.navigation,
    sections: furnitureDetailSections(detail),
  };
}

function furnitureDetailSections(detail: FurnitureDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.recipes?.length)
      sections.push({
        id: "furniture-recipes",
        title: "制作配方",
        content: <FurnitureRecipes recipes={detail.recipes} productName={detail.record.name} />,
      });
  } else if (detail.items?.length) {
    sections.push({
      id: "related-furniture",
      title: "套组成员",
      content: <FurnitureItemGrid items={detail.items} />,
    });
  }
  return sections;
}

function FurnitureItemGrid({ items }: { items: FurnitureItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9rem),1fr))] gap-3">
      {items.map((item) => (
        <FurnitureCard key={item.id} item={item} />
      ))}
    </div>
  );
}
