import type { PlantSeries } from "./model";

export function plantSeriesFields(record: PlantSeries): [string, string | null][] {
  const { summary } = record;
  const fields: [string, string | null][] = [
    ["分类", summary.categories.join("、") || null],
    ["产区", summary.galaxies.join("、") || null],
  ];
  if (summary.harvestCounts.length)
    fields.push(["收获茬数", `${summary.harvestCounts.join(" / ")} 茬`]);
  if (summary.flowerColors.length) fields.push(["花色", summary.flowerColors.join("、")]);
  return fields;
}
