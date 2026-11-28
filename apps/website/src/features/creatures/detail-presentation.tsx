import { RecordImage } from "../omnidex/record-image";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { collectionMembers } from "../omnidex/detail-relations";
import { SeriesImage } from "../omnidex/series-image";
import { creatureEncounterFields, type CreaturesDetail } from "./detail";

export function creaturesDetailPresentation(detail: CreaturesDetail): CatalogDetailPresentation {
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
      ...collectionMembers("creature", items, (item) => item.category),
    };
  }
  const { record } = detail;
  return {
    image: <RecordImage image={record.image} name={record.name} eager />,
    classification: record.category,
    fields: [
      ["学名", record.scientificName],
      ["尺寸范围", record.sizeRange],
    ],
    typeSpecificGroup: { title: "出没", fields: creatureEncounterFields(record) },
    sections: [],
  };
}
