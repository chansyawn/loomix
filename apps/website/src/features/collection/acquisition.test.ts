import { expect, test } from "vite-plus/test";
import { acquisitionLabels, acquisitionText } from "./acquisition";

test("formats absent acquisition without inventing a source", () => {
  for (const value of [null, []]) {
    expect(acquisitionLabels(value)).toEqual([]);
    expect(acquisitionText(value)).toBeNull();
  }
});

test("preserves punctuation while deduplicating display labels in order", () => {
  const acquisition = [
    { sourceId: 1, label: "采集，限时活动" },
    { sourceId: 2, label: "星屿探索" },
    { sourceId: 3, label: "采集，限时活动" },
    { sourceId: 4, label: "星屿探索" },
  ];
  const original = structuredClone(acquisition);
  expect(acquisitionLabels(acquisition)).toEqual(["采集，限时活动", "星屿探索"]);
  expect(acquisitionText(acquisition)).toBe("采集，限时活动，星屿探索");
  expect(acquisition).toEqual(original);
});
