import { describe, expect, it } from "vite-plus/test";
import type { ClothingItem } from "../collection-view.ts";
import type { ClothingData } from "./data";
import { filterGroups, queryClothing } from "./query";
import { clothingSearchSchema, emptyQuery, missing, ungrouped, updateViewQuery } from "./search";

const first: ClothingItem = {
  id: 1,
  name: "白色毛衣",
  image: null,
  description: null,
  quality: 1,
  category: "上装",
  colors: "白色，蓝色",
  materials: "布艺，毛线",
  styles: "青春，古典",
  sources: "商店",
};
const second: ClothingItem = {
  ...first,
  id: 2,
  name: "运动鞋",
  quality: 3,
  category: "鞋子",
  colors: "黑色",
  materials: "橡胶",
  styles: "运动",
  sources: "活动",
};
const third: ClothingItem = {
  ...first,
  id: 3,
  name: "未知服装",
  quality: null,
  category: null,
  colors: null,
  materials: null,
  styles: null,
  sources: null,
};
const data: ClothingData = {
  items: [first, second, third],
  sets: [
    {
      id: 4,
      name: "暖冬",
      quality: 2,
      image: null,
      description: null,
      setName: "暖冬",
      componentIds: [1],
    },
  ],
  appearances: [
    { id: 5, name: "卷发", image: null, description: null, quality: 0, category: "发型" },
  ],
};
const query = (patch: Partial<ReturnType<typeof emptyQuery>>) =>
  queryClothing(data, "items", { ...emptyQuery(), ...patch }).rows.map((row) => row.id);
describe("clothing queries", () => {
  it("combines groups with AND and selections within each group with OR", () => {
    expect(
      query({
        categories: ["上装", "鞋子"],
        colors: ["白色"],
        materials: ["毛线"],
        styles: ["古典"],
        sources: ["商店"],
        qualities: ["1"],
        sets: ["4"],
      }),
    ).toEqual([1]);
    expect(query({ colors: ["白色", "黑色"] })).toEqual([1, 2]);
    expect(query({ q: "  毛衣  " })).toEqual([1]);
    expect(query({ q: "不存在" })).toEqual([]);
  });
  it("filters missing attributes and ungrouped clothing", () => {
    expect(
      query({
        categories: [missing],
        qualities: [missing],
        colors: [missing],
        materials: [missing],
        styles: [missing],
        sources: [missing],
      }),
    ).toEqual([3]);
    expect(query({ sets: [ungrouped] })).toEqual([2, 3]);
  });
  it("sorts without mutating source data and keeps missing qualities last", () => {
    expect(query({ sort: "quality-desc" })).toEqual([2, 1, 3]);
    expect(query({ sort: "quality-asc" })).toEqual([1, 2, 3]);
    expect(query({ sort: "name-desc" })).toEqual(
      [...data.items].sort((a, b) => b.name.localeCompare(a.name, "zh-CN")).map((row) => row.id),
    );
    expect(data.items).toEqual([first, second, third]);
  });
  it("supports set and appearance queries with appropriate filter options", () => {
    expect(queryClothing(data, "sets", { ...emptyQuery(), q: "冬", qualities: ["2"] }).total).toBe(
      1,
    );
    expect(
      queryClothing(data, "appearances", { ...emptyQuery(), categories: ["眼睛"] }).total,
    ).toBe(0);
    expect(filterGroups(data, "sets").map((group) => group.key)).toEqual(["qualities"]);
    expect(filterGroups(data, "appearances").map((group) => group.key)).toEqual([
      "categories",
      "qualities",
    ]);
    expect(
      filterGroups(data, "items").find((group) => group.key === "styles")?.options,
    ).toContainEqual({ value: "古典", label: "古典" });
  });
  it("retains independent view state and recovers malformed search parameters", () => {
    const search = clothingSearchSchema.parse({
      view: "appearances",
      items: { q: "毛衣" },
      appearances: { categories: ["发型"] },
    });
    const updated = updateViewQuery(search, { q: "卷发" });
    expect(updated.items.q).toBe("毛衣");
    expect(updated.appearances.categories).toEqual(["发型"]);
    expect(
      clothingSearchSchema.parse({
        view: "bad",
        items: { q: 42, sort: "bad", qualities: ["9", 0, "1", "1"], colors: "bad" },
        sets: null,
      }),
    ).toMatchObject({
      view: "items",
      items: { q: "", sort: "original", qualities: ["1"], colors: [] },
      sets: emptyQuery(),
    });
  });
});
