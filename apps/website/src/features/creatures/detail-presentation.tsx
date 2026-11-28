import { RecordImage } from "../omnidex/record-image";
import type { CatalogDetailPresentation } from "../omnidex/catalog-detail-presentation";
import { collectionMembers } from "../omnidex/detail-relations";
import { SeriesImage } from "../omnidex/series-image";
import type { CreaturesDetail } from "./detail";
import { quantityField, textField } from "../detail-page/field-model";

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
    fields: [textField("学名", record.scientificName), quantityField("尺寸范围", record.sizeRange)],
    encounterConditions: {
      title: "出没条件",
      fields: [
        textField("地区", record.region),
        textField("栖息地", record.habitat),
        textField("季节", record.activeSeasons),
        textField("时段", record.activeTimes),
        textField("天气", record.activeWeather),
      ],
    },
    sections: [],
  };
}
