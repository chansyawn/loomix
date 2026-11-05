import type { PlantSeries } from "./model";

export function plantSeriesFields(record: PlantSeries): [string, string | null][] {
  const { summary } = record;
  const fields: [string, string | null][] = [
    ["系列", record.seriesName],
    ["成员数量", record.plantIds === null ? null : `${record.plantIds.length} 种植物`],
    ["分类", summary.categories.join("、") || null],
    ["原产星系", summary.galaxies.join("、") || null],
  ];
  if (summary.harvestCounts.length)
    fields.push(["收获茬数", `${summary.harvestCounts.join(" / ")} 茬`]);
  if (summary.acquisition.length) fields.push(["获取来源", summary.acquisition.join("、")]);
  if (summary.flowerColors.length) fields.push(["花色", summary.flowerColors.join("、")]);
  return fields;
}
