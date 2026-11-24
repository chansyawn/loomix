import { RecordImage } from "@/features/omnidex/record-image";
import { SeriesImage } from "../omnidex/series-image";
import { DetailRelatedGrid, type DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { DishesCard, DishSeriesCard } from "./dishes-card";
import type { DishesDetail } from "./detail";
import { DishRecipe } from "./recipe";
import { DishEffects } from "./effects";
import { formatTastes, strengthText, unlockConditionLabel } from "./presentation";

export function dishesDetailPresentation(detail: DishesDetail): CatalogDetailPresentation {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["难度", detail.record.difficulty],
          ["解锁条件", unlockConditionLabel(detail.record.unlockCondition)],
          ["口味", formatTastes(detail.record.tastes)],
          ["星系风味", detail.record.galaxyFlavor],
          ["炊具", detail.record.cookware],
          ["基础效果", strengthText(detail.record.strength)],
          ["获取方式", detail.record.acquisition],
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 道菜肴`],
        ];

  return {
    image:
      detail.kind === "item" ? (
        <RecordImage key={record.image} image={record.image} name={record.name} eager />
      ) : (
        <SeriesImage
          name={record.name}
          image={record.image}
          memberIds={detail.record.dishIds}
          items={detail.items ?? []}
          eager
        />
      ),
    description: (detail.kind === "item" || record.description) && (
      <p className="text-sm/7 whitespace-pre-line text-muted-foreground">
        {record.description || "描述未提供"}
      </p>
    ),
    fields,
    sections: dishDetailSections(detail),
    showEmptyExtras: true,
  };
}

function dishDetailSections(detail: DishesDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.kind === "item") {
    if (detail.record.effects?.length)
      sections.push({
        id: "dish-effects",
        title: "特殊效果",
        content: <DishEffects effects={detail.record.effects} />,
      });
    if (detail.record.slots.length)
      sections.push({ id: "dish-recipe", title: "配方", content: <DishRecipe detail={detail} /> });
  }
  if (
    (detail.kind === "item" && detail.series.length > 0) ||
    (detail.kind === "series" && detail.items?.length)
  )
    sections.push({
      id: "related-dishes",
      title: detail.kind === "item" ? "所属系列" : "系列成员",
      content: <DishesRelated detail={detail} />,
    });
  return sections;
}

function DishesRelated({ detail }: { detail: DishesDetail }) {
  return detail.kind === "item" ? (
    <>
      <DetailRelatedGrid>
        {detail.series.map((series) => (
          <DishSeriesCard key={series.id} series={series} items={detail.catalogItems} />
        ))}
      </DetailRelatedGrid>
      {detail.hasUnconfirmedSeriesMembership && (
        <p className="text-sm text-muted-foreground">其他系列的成员关系未确认</p>
      )}
    </>
  ) : (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
      {detail.items?.map((item) => (
        <DishesCard key={item.id} item={item} />
      ))}
    </div>
  );
}
