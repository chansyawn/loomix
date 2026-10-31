import { expect, test } from "vite-plus/test";
import { acquisitionLabels, acquisitionText } from "./acquisition";

test("formats absent acquisition without inventing a source", () => {
  for (const value of [null, []]) {
    expect(acquisitionLabels(value)).toEqual([]);
    expect(acquisitionText(value)).toBeNull();
  }
});

test("preserves punctuation and conditions while deduplicating display labels in order", () => {
  const acquisition = [
    { sourceId: 1, label: "采集，限时活动", condition: null },
    { sourceId: 2, label: "星屿探索", condition: "完成探索" },
    { sourceId: 3, label: "采集，限时活动", condition: null },
    { sourceId: 4, label: "星屿探索", condition: null },
  ];
  const original = structuredClone(acquisition);
  expect(acquisitionLabels(acquisition)).toEqual([
    "采集，限时活动",
    "星屿探索（完成探索）",
    "星屿探索",
  ]);
  expect(acquisitionText(acquisition)).toBe("采集，限时活动，星屿探索（完成探索），星屿探索");
  expect(acquisition).toEqual(original);
});
