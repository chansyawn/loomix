import { RecordImage } from "../omnidex/record-image";
import type { DetailField } from "../detail-page/detail-page";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { collectionMembers } from "../omnidex/detail-relations";
import { CreaturesCard } from "./creatures-card";
import { SeriesImage } from "../omnidex/series-image";
import type { CreaturesDetail } from "./detail";

export function creaturesDetailPresentation(
  detail: CreaturesDetail,
  encounterSummary: string | null,
): CatalogDetailPresentation {
  if (detail.kind === "series") {
    const { record, items } = detail;
    return {
      image: (
        <SeriesImage
          name={record.name}
          image={record.image}
          memberIds={record.creatureIds}
          items={items ?? []}
          eager
        />
      ),
      ...collectionMembers("creature", items, (item) => <CreaturesCard item={item} />),
    };
  }
  const { record } = detail;
  const conditions: DetailField[] = [
    ["地区", record.region],
    ["栖息地", record.habitat],
    ["季节", record.activeSeasons],
    ["时段", record.activeTimes],
    ["天气", record.activeWeather],
  ];
  const known = conditions.filter(([, value]) => value);
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    classification: record.category,
    fields: [
      ["学名", record.scientificName],
      ["尺寸范围", record.sizeRange],
      ["出没条件", encounterSummary],
    ],
    sections:
      known.length && !encounterSummary
        ? [
            {
              id: "creature-conditions",
              title: "出没条件",
              content: (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {known.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ),
            },
          ]
        : [],
  };
}
