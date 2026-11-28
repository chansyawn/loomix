import { RecordImage } from "@/features/omnidex/record-image";
import { SeriesImage } from "../omnidex/series-image";
import type { DetailSection } from "@/features/detail-page/detail-page";
import { collectionMembers } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import type { DishesDetail } from "./detail";
import { DishRecipe } from "./recipe";
import { hintField, textField } from "../detail-page/field-model";
import { catalogTagField, type OverviewTag } from "../omnidex/overview-tags";
import { dishCardAttributes, strengthText, unlockConditionLabel } from "./presentation";

export function dishesDetailPresentation(
  detail: DishesDetail,
  origins: readonly OverviewTag[],
): CatalogDetailPresentation {
  if (detail.kind === "series") {
    const { record, items } = detail;
    return {
      image: (
        <SeriesImage
          name={record.name}
          image={record.image}
          memberIds={record.dishIds}
          items={items ?? []}
          eager
        />
      ),
      ...collectionMembers("dish", items, dishCardAttributes),
    };
  }
  const { record } = detail;
  const sections: DetailSection[] = [];
  if (record.slots.length)
    sections.push({
      id: "dish-recipe",
      title: "烹饪配方",
      content: <DishRecipe detail={detail} />,
    });
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    fields: [
      textField("难度", record.difficulty),
      hintField("解锁条件", unlockConditionLabel(record.unlockCondition)),
      textField("口味", record.tastes?.join("、")),
      catalogTagField("星系风味", origins),
      textField("炊具", record.cookware),
    ],
    typeSpecificGroup: {
      title: "食用效果",
      fields: [
        textField("基础效果", strengthText(record.strength)),
        { kind: "effects", label: "特殊效果", value: record.effects ?? [] },
      ],
    },
    sections,
  };
}
