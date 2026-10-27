import { describe, expect, it } from "vite-plus/test";
import type { FurnitureItem, FurnitureSet } from "../collection-view.ts";
import { filterGroups, membershipIndex, queryFurniture } from "./query";
import { emptyQuery, missing, ungrouped } from "./search";

function item(
  id: number,
  name: string,
  fields: Partial<Omit<FurnitureItem, "id" | "name">> = {},
): FurnitureItem {
  return {
    id,
    name,
    image: null,
    description: null,
    quality: null,
    category: null,
    type: null,
    size: null,
    colors: null,
    materials: null,
    sources: null,
    craftingRecipes: null,
    ...fields,
  };
}

const items: FurnitureItem[] = [
  item(1, "手工图桌", {
    quality: 0,
    category: "其他",
    type: "制作台",
    colors: "棕色",
    materials: "金属，木制",
    sources: "格连商店购买",
  }),
  item(2, "白色木椅", {
    quality: 2,
    category: "起居",
    type: "椅子",
    colors: "白色",
    materials: "木制",
  }),
  item(3, "黄色木灯", {
    quality: 2,
    category: "装饰物",
    type: "灯具",
    colors: "黄色，白色",
    materials: "金属，木制",
  }),
  item(4, "黄色金属椅", {
    quality: 4,
    category: "起居",
    type: "椅子",
    colors: "黄色",
    materials: "金属",
  }),
  item(5, "白色木花盆", {
    quality: 1,
    category: "绿植",
    type: "花盆",
    colors: "白色",
    materials: "木制",
  }),
  item(6, "未分类家具"),
  item(7, "Alpha Shelf", {
    quality: 2,
    category: "起居",
    type: "置物架",
    colors: "蓝色",
    materials: "木制",
  }),
];
const sets: FurnitureSet[] = [
  {
    id: 101,
    name: "木制套组",
    image: null,
    description: null,
    quality: 2,
    seriesName: null,
    componentIds: [3, 2],
  },
  {
    id: 102,
    name: "白色套组",
    image: null,
    description: null,
    quality: null,
    seriesName: null,
    componentIds: [2, 5],
  },
  {
    id: 103,
    name: "未知套组",
    image: null,
    description: null,
    quality: 0,
    seriesName: null,
    componentIds: null,
  },
];
const data = { items, sets, ingredientItemsById: new Map() };

function ids(rows: { id: number }[]): number[] {
  return rows.map((row) => row.id);
}

function options(key: string) {
  return filterGroups(data).find((group) => group.key === key)!.options;
}

describe("furniture catalog", () => {
  it("returns the complete catalog in input order for either view", () => {
    expect(queryFurniture(data, "items", emptyQuery())).toMatchObject({ total: 7, rows: items });
    expect(queryFurniture(data, "sets", emptyQuery())).toMatchObject({ total: 3, rows: sets });
    expect(queryFurniture({ items: [], sets: [] }, "items", emptyQuery()).rows).toEqual([]);
  });

  it("combines choices within a group with OR and different groups with AND", () => {
    const result = queryFurniture(data, "items", {
      ...emptyQuery(),
      colors: ["白色", "黄色"],
      materials: ["木制"],
      categories: ["起居", "装饰物"],
    });
    expect(ids(result.rows)).toEqual([2, 3]);
    expect(result.total).toBe(2);
    expect(ids(queryFurniture(data, "items", { ...emptyQuery(), types: ["椅子"] }).rows)).toEqual([
      2, 4,
    ]);
  });

  it("trims search terms, matches names case-insensitively and matches complete sources", () => {
    expect(ids(queryFurniture(data, "items", { ...emptyQuery(), q: "  手工图桌  " }).rows)).toEqual(
      [1],
    );
    expect(ids(queryFurniture(data, "items", { ...emptyQuery(), q: "ALPHA" }).rows)).toEqual([7]);
    expect(queryFurniture(data, "items", { ...emptyQuery(), sources: ["格连商店"] }).rows).toEqual(
      [],
    );
    expect(
      ids(queryFurniture(data, "items", { ...emptyQuery(), sources: ["格连商店购买"] }).rows),
    ).toEqual([1]);
    expect(queryFurniture(data, "items", { ...emptyQuery(), q: "不存在的家具" }).rows).toEqual([]);
  });

  it("finds overlapping memberships and ungrouped items through IDs without changing item order", () => {
    expect(ids(queryFurniture(data, "items", { ...emptyQuery(), sets: ["101"] }).rows)).toEqual([
      2, 3,
    ]);
    expect(
      ids(queryFurniture(data, "items", { ...emptyQuery(), sets: ["101", "102"] }).rows),
    ).toEqual([2, 3, 5]);
    expect(ids(queryFurniture(data, "items", { ...emptyQuery(), sets: [ungrouped] }).rows)).toEqual(
      [1, 4, 6, 7],
    );
    expect(ids(membershipIndex(sets).get(2)!)).toEqual([101, 102]);
    expect(queryFurniture(data, "items", { ...emptyQuery(), sets: ["103"] }).rows).toEqual([]);
  });

  it("exposes missing attributes and distinct category and type choices", () => {
    expect(ids(queryFurniture(data, "items", { ...emptyQuery(), colors: [missing] }).rows)).toEqual(
      [6],
    );
    expect(
      ids(queryFurniture(data, "items", { ...emptyQuery(), qualities: [missing] }).rows),
    ).toEqual([6]);
    expect(options("colors")).toContainEqual({ value: missing, label: "未提供" });
    expect(options("qualities")).toContainEqual({ value: missing, label: "未提供" });
    expect(options("categories").map((option) => option.value)).toEqual([
      "起居",
      "装饰物",
      "功能家具",
      "硬装",
      "绿植",
      "户外布设",
      "其他",
    ]);
    expect(options("types").map((option) => option.value)).toEqual(
      expect.arrayContaining(["制作台", "椅子", "灯具", "花盆", "置物架", missing]),
    );
    expect(options("types")).toHaveLength(6);
    expect(options("colors").filter((option) => option.value === "白色")).toHaveLength(1);
  });

  it("sorts quality in both directions, preserving ties, missing values last and input data", () => {
    expect(
      ids(queryFurniture(data, "items", { ...emptyQuery(), sort: "quality-desc" }).rows),
    ).toEqual([4, 2, 3, 7, 5, 1, 6]);
    expect(
      ids(queryFurniture(data, "items", { ...emptyQuery(), sort: "quality-asc" }).rows),
    ).toEqual([1, 5, 2, 3, 7, 4, 6]);
    expect(ids(items)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("sorts names in either direction and filters set names and quality", () => {
    const english = { items: [item(1, "Beta"), item(2, "Alpha")], sets: [] };
    expect(
      ids(queryFurniture(english, "items", { ...emptyQuery(), sort: "name-asc" }).rows),
    ).toEqual([2, 1]);
    expect(
      ids(queryFurniture(english, "items", { ...emptyQuery(), sort: "name-desc" }).rows),
    ).toEqual([1, 2]);
    expect(
      ids(queryFurniture(data, "sets", { ...emptyQuery(), q: "木制", qualities: ["2"] }).rows),
    ).toEqual([101]);
    expect(
      ids(queryFurniture(data, "sets", { ...emptyQuery(), qualities: [missing] }).rows),
    ).toEqual([102]);
  });
});
