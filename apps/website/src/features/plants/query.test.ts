import { describe, expect, it } from "vite-plus/test";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import type { PlantSeed } from "./model";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "./fixture";
import { filterGroups, queryPlants } from "./query";
import { emptyQuery, missing, ungrouped } from "./search";

function item(id: number, fields: Partial<PlantItem> = {}): PlantItem {
  return plantItemFixture({
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
  });
}

function seed(
  id: number,
  fields: Partial<PlantSeed> = {},
  detail: Partial<PlantSeed["detail"]> = {},
): PlantSeed {
  const record = plantSeedFixture({
    id,
    name: `种子${id}`,
    ...fields,
  });
  return { ...record, detail: { ...record.detail, ...detail } };
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
  plantSeriesFixture({
    id: 100,
    name: "星屿花系列",
    image: null,
    description: null,
    quality: 1,
    seriesName: null,
    plantIds: [2, 1],
  }),
  plantSeriesFixture({
    id: 101,
    name: "禾夏系列",
    image: null,
    description: null,
    quality: 2,
    seriesName: null,
    plantIds: [1],
  }),
  plantSeriesFixture({
    id: 102,
    name: "未定系列",
    image: null,
    description: null,
    quality: null,
    seriesName: null,
    plantIds: null,
  }),
];
const data = plantsDataFixture({ items, series });
const seeds = [
  seed(
    10,
    { name: "A番茄种子", productIds: [1] },
    {
      harvestCount: 3,
      acquisitionConditions: [{ sourceId: 1, label: "格连商店购买", condition: null }],
    },
  ),
  seed(
    11,
    { name: "B甜瓜种子", productIds: [2] },
    {
      harvestCount: 1,
      acquisitionConditions: [{ sourceId: 2, label: "星屿探索", condition: "完成探索" }],
    },
  ),
  seed(12, { name: "C未知种子", productIds: [999] }),
];
const seedData = plantsDataFixture({ items, series, seeds });
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
    expect(
      queryPlants(plantsDataFixture({ items: [], series: [] }), "items", emptyQuery()).total,
    ).toBe(0);
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

  it("filters confirmed sources and flower colors independently in both views", () => {
    const flower = item(5, { name: "白百合", sources: "采集，花卉杂交", flowerColors: ["白色"] });
    const flowerSeries = plantSeriesFixture({
      id: 105,
      name: "百合",
      plantIds: [5],
      summary: flower.summary,
    });
    const entries = plantsDataFixture({
      items: [...items, flower],
      series: [...series, flowerSeries],
    });
    const query = { ...emptyQuery(), sources: ["花卉杂交"], flowerColors: ["白色"] };
    expect(ids(queryPlants(entries, "items", query).rows)).toEqual([5]);
    expect(ids(queryPlants(entries, "series", query).rows)).toEqual([105]);
    expect(queryPlants(entries, "items", { ...query, flowerColors: ["红色"] }).total).toBe(0);
    expect(
      ids(queryPlants(entries, "items", { ...emptyQuery(), sources: [missing] }).rows),
    ).toEqual([1, 2, 3, 4]);
    const groups = filterGroups(entries);
    expect(groups.find((group) => group.key === "sources")?.options).toContainEqual({
      value: "花卉杂交",
      label: "花卉杂交",
    });
    expect(groups.find((group) => group.key === "flowerColors")?.options).toContainEqual({
      value: "白色",
      label: "白色",
    });
  });
});

describe("seed catalog", () => {
  const querySeeds = (patch: Partial<ReturnType<typeof emptyQuery>>) =>
    queryPlants(seedData, "seeds", { ...emptyQuery(), ...patch });

  it("searches, sorts and preserves the original seed collection", () => {
    expect(querySeeds({}).rows).toEqual(seeds);
    expect(ids(querySeeds({ q: "番茄" }).rows)).toEqual([10]);
    expect(ids(querySeeds({ q: "种子" }).rows)).toEqual([10, 11, 12]);
    expect(ids(querySeeds({ sort: "name-asc" }).rows)).toEqual([10, 11, 12]);
    expect(ids(seeds)).toEqual([10, 11, 12]);
  });

  it("combines source, harvest count and series filters", () => {
    expect(ids(querySeeds({ sources: ["格连商店购买"], harvestCounts: ["3"] }).rows)).toEqual([10]);
    expect(ids(querySeeds({ sources: ["星屿探索（完成探索）"] }).rows)).toEqual([11]);
    expect(ids(querySeeds({ series: ["100", "101"] }).rows)).toEqual([10, 11]);
    expect(querySeeds({ harvestCounts: ["__missing"] }).total).toBe(1);
  });

  it("filters seeds without confirmed series and builds seed-specific facets", () => {
    const complete = plantsDataFixture({
      items,
      series: series.filter((group) => group.plantIds !== null),
      seeds,
    });
    expect(
      ids(queryPlants(complete, "seeds", { ...emptyQuery(), series: ["__ungrouped"] }).rows),
    ).toEqual([12]);
    const groups = filterGroups(complete, "seeds");
    expect(groups.map((group) => group.key)).toEqual(["sources", "harvestCounts", "series"]);
    expect(groups.find((group) => group.key === "sources")?.options).toContainEqual({
      value: "星屿探索（完成探索）",
      label: "星屿探索（完成探索）",
    });
    expect(groups.find((group) => group.key === "series")?.options).toContainEqual({
      value: "100",
      label: "星屿花系列",
    });
  });
});
