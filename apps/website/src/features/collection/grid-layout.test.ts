import { describe, expect, it } from "vite-plus/test";
import { compactGrid, gridGeometry, gridRow, wideGrid } from "./grid-layout";
import { collectionSort, tableSorting } from "./sort";

describe("collection grid geometry", () => {
  it.each([
    [335, 1],
    [336, 2],
    [539, 2],
    [540, 3],
    [740, 4],
    [940, 5],
    [1140, 6],
  ])("uses the existing compact columns at width %i", (width, columns) => {
    const result = gridGeometry(width, compactGrid(80));
    expect(result.columns).toBe(columns);
    expect(result.cardWidth * columns + (columns - 1) * 16).toBeCloseTo(width);
    expect(result.rowHeight).toBeCloseTo(result.cardWidth + 80);
  });

  it("keeps wide images and square series on their own height estimates", () => {
    expect(gridGeometry(600, wideGrid(110))).toEqual({
      columns: 2,
      cardWidth: 292,
      rowHeight: 256,
    });
    expect(gridGeometry(600, wideGrid(120, 1)).rowHeight).toBe(412);
    expect(gridGeometry(960, wideGrid(110)).columns).toBe(3);
  });

  it("supports minimum-width grids and groups partial final rows without losing records", () => {
    const layout = { ...compactGrid(100), minWidth: 176 };
    expect(gridGeometry(100, layout).columns).toBe(1);
    expect(gridGeometry(368, layout).columns).toBe(2);
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
