import { describe, expect, it } from "vite-plus/test";
import { compactGrid, gridGeometry, gridRow, wideGrid } from "./grid-layout";

describe("collection grid geometry", () => {
  it.each([
    [100, 1],
    [319, 1],
    [320, 2],
    [487, 2],
    [488, 3],
    [655, 3],
    [656, 4],
    [823, 4],
    [824, 5],
    [991, 5],
    [992, 6],
    [1159, 6],
    [1160, 7],
    [1800, 7],
  ])("fits standard cards at width %i without exceeding seven columns", (width, columns) => {
    const result = gridGeometry(width, compactGrid(78));
    expect(result.columns).toBe(columns);
    expect(result.cardWidth * columns + (columns - 1) * 16).toBeCloseTo(width);
    expect(result.cardWidth).toBeGreaterThanOrEqual(Math.min(width, 152));
    expect(result.rowHeight).toBeCloseTo(result.cardWidth + 78);
  });

  it.each([
    [100, 1],
    [463, 1],
    [464, 2],
    [703, 2],
    [704, 3],
    [943, 3],
    [944, 4],
    [1183, 4],
    [1184, 5],
    [2400, 5],
  ])("fits wide cards at width %i without exceeding five columns", (width, columns) => {
    const result = gridGeometry(width, wideGrid(124));
    expect(result.columns).toBe(columns);
    expect(result.cardWidth * columns + (columns - 1) * 16).toBeCloseTo(width);
    expect(result.cardWidth).toBeGreaterThanOrEqual(Math.min(width, 224));
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
