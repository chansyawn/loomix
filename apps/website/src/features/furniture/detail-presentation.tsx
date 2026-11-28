import { FurnitureCard } from "./furniture-card";
import type { DetailField, DetailSection } from "@/features/detail-page/detail-page";
import { collectionMembers } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { RecordImage as FurnitureImage } from "@/features/omnidex/record-image";
import type { FurnitureDetail } from "./detail";
import { FurnitureRecipes } from "./recipes";

export function furnitureDetailPresentation(detail: FurnitureDetail): CatalogDetailPresentation {
  const { record } = detail;
  const fields: DetailField[] = [];
  const sections: DetailSection[] = [];
  if (detail.kind === "set") {
    const members = collectionMembers("furniture", detail.items, (item) => (
      <FurnitureCard item={item} />
    ));
    fields.push(...members.fields);
    sections.push(...members.sections);
  } else {
    fields.push(
      ["分类", detail.record.category],
      [
        "家具类型",
        detail.record.furnitureCategory === detail.record.category
          ? null
          : detail.record.furnitureCategory,
      ],
      ["占地尺寸", detail.record.size],
    );
    if (detail.recipes.length)
      sections.push({
        id: "furniture-recipes",
        title: "制作配方",
        content: <FurnitureRecipes recipes={detail.recipes} productName={record.name} />,
      });
  }
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
    fields,
    navigation: detail.navigation,
    sections,
  };
}
