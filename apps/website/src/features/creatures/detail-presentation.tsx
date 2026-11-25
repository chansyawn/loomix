import { RecordImage } from "@/features/omnidex/record-image";
import { DetailRelatedGrid, type DetailSection } from "@/features/detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { CreaturesCard, CreatureSeriesCard } from "./creatures-card";
import { SeriesImage } from "../omnidex/series-image";
import type { CreaturesDetail } from "./detail";
import { ItemIngredientTags } from "../ingredients/item-usage";

export function creaturesDetailPresentation(detail: CreaturesDetail): CatalogDetailPresentation {
  const { record } = detail;
  const fields: [string, string | null][] =
    detail.kind === "item"
      ? [
          ["分类", detail.record.category],
          ["学名", detail.record.scientificName],
          ["地区", detail.record.region],
          ["栖息地", detail.record.habitat],
          ["出没季节", detail.record.activeSeasons],
          ["出没时段", detail.record.activeTimes],
          ["出没天气", detail.record.activeWeather],
          ...(detail.record.sizeRange
            ? [["尺寸", detail.record.sizeRange] satisfies [string, string]]
            : []),
        ]
      : [
          ["系列", detail.record.seriesName],
          ["成员数量", detail.items === null ? null : `${detail.items.length} 种生物`],
        ];
  return {
    image:
      detail.kind === "item" ? (
        <RecordImage key={record.image} image={record.image} name={record.name} eager />
      ) : (
        <SeriesImage
          name={record.name}
          image={record.image}
          memberIds={detail.record.creatureIds}
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
    sections: creatureDetailSections(detail),
    showEmptyExtras: true,
  };
}

function creatureDetailSections(detail: CreaturesDetail): DetailSection[] {
  const sections: DetailSection[] = [];
  if (detail.kind === "item" && detail.cooking)
    sections.push({
      id: "item-ingredient-tags",
      title: "食材标签",
      content: <ItemIngredientTags tags={detail.cooking.tags} />,
    });
  if (
    (detail.kind === "item" && detail.series.length > 0) ||
    (detail.kind === "series" && detail.items?.length)
  )
    sections.push({
      id: "related-creatures",
      title: detail.kind === "item" ? "所属系列" : "系列成员",
      content: <CreaturesRelated detail={detail} />,
    });
  return sections;
}

function CreaturesRelated({ detail }: { detail: CreaturesDetail }) {
  return detail.kind === "item" ? (
    <DetailRelatedGrid>
      {detail.series.map((series) => (
        <CreatureSeriesCard key={series.id} series={series} items={detail.catalogItems} />
      ))}
    </DetailRelatedGrid>
  ) : (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3">
      {detail.items?.map((item) => (
        <CreaturesCard key={item.id} item={item} />
      ))}
    </div>
  );
}
