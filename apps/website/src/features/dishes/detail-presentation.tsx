import { RecordImage } from "@/features/omnidex/record-image";
import { SeriesImage } from "../omnidex/series-image";
import type { DetailSection } from "@/features/detail-page/detail-page";
import { collectionMembers } from "../omnidex/detail-relations";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { DishesCard } from "./dishes-card";
import type { DishesDetail } from "./detail";
import { DishRecipe } from "./recipe";
import { DishEffects } from "./effects";
import { formatTastes, strengthText, unlockConditionLabel } from "./presentation";

export function dishesDetailPresentation(detail: DishesDetail): CatalogDetailPresentation {
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
      ...collectionMembers("dish", items, (item) => <DishesCard item={item} />),
    };
  }
  const { record } = detail;
  const sections: DetailSection[] = [];
  if (record.effects?.length)
    sections.push({
      id: "dish-effects",
      title: "特殊效果",
      content: <DishEffects effects={record.effects} />,
    });
  if (record.slots.length)
    sections.push({
      id: "dish-recipe",
      title: "烹饪配方",
      content: <DishRecipe detail={detail} />,
    });
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    fields: [
      ["难度", record.difficulty],
      ["解锁条件", unlockConditionLabel(record.unlockCondition)],
      ["口味", formatTastes(record.tastes)],
      ["星系风味", record.galaxyFlavor],
      ["炊具", record.cookware],
      ["基础效果", strengthText(record.strength)],
    ],
    sections,
  };
}
