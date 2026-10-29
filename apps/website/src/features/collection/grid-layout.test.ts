import { describe, expect, it } from "vite-plus/test";
import { compactGrid, gridGeometry, gridRow, wideGrid } from "./grid-layout";
import { collectionSort, tableSorting } from "./sort";

describe("collection grid geometry", () => {
  it.each([
    [100, 1],
    [367, 1],
    [368, 2],
    [559, 2],
    [560, 3],
    [751, 3],
    [752, 4],
    [943, 4],
    [944, 5],
    [1135, 5],
    [1136, 6],
    [1800, 6],
  ])("fits standard cards at width %i without exceeding six columns", (width, columns) => {
    const result = gridGeometry(width, compactGrid(78));
    expect(result.columns).toBe(columns);
    expect(result.cardWidth * columns + (columns - 1) * 16).toBeCloseTo(width);
    expect(result.cardWidth).toBeGreaterThanOrEqual(Math.min(width, 176));
    expect(result.rowHeight).toBeCloseTo(result.cardWidth + 78);
  });

  it.each([
    [100, 1],
    [591, 1],
    [592, 2],
    [895, 2],
    [896, 3],
    [1199, 3],
    [1200, 4],
    [1488, 4],
    [2400, 4],
  ])("fits wide cards at width %i without exceeding four columns", (width, columns) => {
    const result = gridGeometry(width, wideGrid(124));
    expect(result.columns).toBe(columns);
    expect(result.cardWidth * columns + (columns - 1) * 16).toBeCloseTo(width);
    expect(result.cardWidth).toBeGreaterThanOrEqual(Math.min(width, 288));
    expect(result.rowHeight).toBeCloseTo(result.cardWidth / 2 + 124);
  });

  it("groups partial final rows without losing records", () => {
    const rows = [1, 2, 3, 4, 5];
    expect(gridRow(rows, 0, 2)).toEqual([1, 2]);
    expect(gridRow(rows, 2, 2)).toEqual([5]);
    expect(gridRow(rows, 3, 2)).toEqual([]);
    expect(rows).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("collection sorting adapters", () => {
  it("round trips supported sorts and clears unsupported table sorting", () => {
    for (const sort of [
      "original",
      "name-asc",
      "name-desc",
      "quality-asc",
      "quality-desc",
    ] as const)
      expect(collectionSort(tableSorting(sort))).toBe(sort);
    expect(collectionSort([{ id: "category", desc: false }])).toBe("original");
  });
});
