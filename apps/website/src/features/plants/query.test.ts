import { describe, expect, it } from "vite-plus/test";
import type { PlantItem, PlantSeries } from "@loomix/content-schema";
import { filterGroups, queryPlants } from "./query";
import { emptyQuery, missing, ungrouped } from "./search";

function item(id: number, fields: Partial<PlantItem> = {}): PlantItem {
  return {
    id,
    name: `植物${id}`,
    image: null,
    description: null,
    quality: null,
    category: null,
    originGalaxy: null,
    maturityPeriod: null,
    harvestCount: null,
    ...fields,
  };
}

const items = [
  item(1, {
    name: "星露花",
    quality: 2,
    category: "花卉",
    originGalaxy: "禾夏，星屿",
    harvestCount: 3,
  }),
  item(2, {
    name: "甜果",
    quality: 0,
    category: "作物",
    originGalaxy: "禾夏",
    harvestCount: 1,
  }),
  item(3),
  item(4, { name: "Alpha", quality: 2, harvestCount: 1 }),
];
const series: PlantSeries[] = [
  {
    id: 100,
    name: "星屿花系列",
    image: null,
    description: null,
    quality: 1,
    seriesName: null,
    plantIds: [2, 1],
  },
  {
    id: 101,
    name: "禾夏系列",
    image: null,
    description: null,
    quality: 2,
    seriesName: null,
    plantIds: [1],
  },
  {
    id: 102,
    name: "未定系列",
    image: null,
    description: null,
    quality: null,
    seriesName: null,
    plantIds: null,
  },
];
const data = { items, series };
const ids = (rows: { id: number }[]) => rows.map((row) => row.id);
const search = (patch: Partial<ReturnType<typeof emptyQuery>>) =>
  queryPlants(data, "items", { ...emptyQuery(), ...patch });

describe("plant catalog", () => {
  it("returns original order and searches plant and series names", () => {
    expect(queryPlants(data, "items", emptyQuery()).rows).toEqual(items);
    expect(queryPlants(data, "series", emptyQuery()).rows).toEqual(series);
    expect(ids(search({ q: " 花 " }).rows)).toEqual([1]);
    expect(ids(search({ q: "ALPHA" }).rows)).toEqual([4]);
    expect(ids(queryPlants(data, "series", { ...emptyQuery(), q: "禾夏" }).rows)).toEqual([101]);
    expect(search({ q: "不存在" }).total).toBe(0);
    expect(queryPlants({ items: [], series: [] }, "items", emptyQuery()).total).toBe(0);
  });

  it("combines facets with AND and multiple selected values with OR", () => {
    expect(
      ids(search({ categories: ["花卉", "作物"], galaxies: ["星屿"], qualities: ["2"] }).rows),
    ).toEqual([1]);
    expect(ids(search({ galaxies: ["禾夏"] }).rows)).toEqual([1, 2]);
  });

  it("matches overlapping memberships and ungrouped plants", () => {
    expect(ids(search({ series: ["100", "101"] }).rows)).toEqual([1, 2]);
    expect(ids(search({ series: [ungrouped] }).rows)).toEqual([]);
    const groups = filterGroups(data).find((group) => group.key === "series")?.options;
    expect(groups).not.toContainEqual({ value: "102", label: "未定系列" });
    expect(groups).not.toContainEqual({ value: ungrouped, label: "未归入系列" });
  });

  it("filters missing fields and known harvest counts", () => {
    expect(ids(search({ categories: [missing], galaxies: [missing] }).rows)).toEqual([3, 4]);
    expect(ids(search({ harvestCounts: ["1"] }).rows)).toEqual([2, 4]);
    expect(ids(search({ harvestCounts: [missing] }).rows)).toEqual([3]);
    const groups = filterGroups(data);
    expect(groups.find((group) => group.key === "galaxies")?.options).toContainEqual({
      value: "星屿",
      label: "星屿",
    });
    expect(groups.find((group) => group.key === "harvestCounts")?.options).toContainEqual({
      value: missing,
      label: "未提供",
    });
  });

  it("sorts by name and quality with missing values last without mutating input", () => {
    expect(ids(search({ sort: "quality-desc" }).rows)).toEqual([1, 4, 2, 3]);
    expect(ids(search({ sort: "quality-asc" }).rows)).toEqual([2, 1, 4, 3]);
    expect(ids(search({ sort: "name-asc" }).rows)).toEqual([2, 1, 3, 4]);
    expect(ids(items)).toEqual([1, 2, 3, 4]);
  });
});
