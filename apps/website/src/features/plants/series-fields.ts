import type { PlantSeries } from "./model";
import { quantityField, textField, type DetailField } from "../detail-page/field-model";

export function plantSeriesFields(record: PlantSeries): DetailField[] {
  const { summary } = record;
  const fields: DetailField[] = [textField("产区", summary.galaxies.join("、"))];
  if (summary.harvestCounts.length)
    fields.push(quantityField("收获茬数", `${summary.harvestCounts.join("、")} 茬`));
  if (summary.flowerColors.length)
    fields.push({
      kind: "tags",
      label: "花色",
      value: summary.flowerColors.map((name) => ({ key: name, name })),
    });
  return fields;
}
