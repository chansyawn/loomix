import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture.ts";
import type { FurnitureItem, FurnitureSet } from "../collection-view.ts";
import { furnitureDetail, loadFurnitureDetail, parseFurnitureId } from "./detail";

const first: FurnitureItem = {
  id: 1,
  name: "木椅",
  image: null,
  quality: null,
  description: null,
  category: null,
  furnitureCategory: null,
  size: null,
  colors: null,
  materials: null,
  acquisition: null,
  creationCards: [],
};
const second: FurnitureItem = { ...first, id: 2, name: "木桌" };
const set: FurnitureSet = {
  id: 3,
  name: "木制套组",
  image: null,
  quality: null,
  description: null,
  seriesName: null,
  componentIds: [2, 1],
};
const ingredientItemsById = new Map([
  [
    1,
    {
      id: 1,
      name: "木椅",
      image: null,
      description: null,
      quality: null,
      catalogCategory: "furniture" as const,
    },
  ],
  [
    2,
    {
      id: 2,
      name: "木桌",
      image: null,
      description: null,
      quality: null,
      catalogCategory: "furniture" as const,
    },
  ],
]);
const data = {
  items: [first, second],
  sets: [set, { ...set, id: 4, componentIds: [1] }],
  ingredientItemsById,
};

afterEach(() => vi.unstubAllGlobals());

describe("furniture details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseFurnitureId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseFurnitureId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("家具单品保留自身字段，无套组时不生成切换项", () => {
    expect(furnitureDetail(data, "items", 1)).toMatchObject({
      kind: "item",
      record: first,
      recipes: [],
    });
    expect(furnitureDetail({ ...data, sets: [] }, "items", 1).navigation.groups).toEqual([]);
  });
  it("同组导航仅包含直接归属，不扩展间接关联的套组", () => {
    const third = { ...first, id: 5, name: "木凳" };
    const overlapping = {
      ...data,
      items: [...data.items, third],
      sets: [
        { ...set, componentIds: [5, 2, 1] },
        { ...set, id: 4, componentIds: [2, 5] },
      ],
    };
    expect(
      furnitureDetail(overlapping, "items", 1).navigation.groups.map((group) =>
        group.entries.map((entry) => entry.id),
      ),
    ).toEqual([[3, 5, 2, 1]]);
  });
  it("家具和套组详情提供同组切换，概览与成员顺序一致", () => {
    const item = furnitureDetail(data, "items", 1);
    expect(item.navigation.groups.map((group) => group.entries.map((entry) => entry.id))).toEqual([
      [3, 2, 1],
      [4, 1],
    ]);
    expect(furnitureDetail(data, "sets", 3).navigation.groups).toEqual([item.navigation.groups[0]]);
  });
  it("resolves crafting materials and keeps unknown materials as null", () => {
    const recipeData = {
      ...data,
      items: [
        {
          ...first,
          creationCards: [
            {
              id: 10,
              name: "创想卡 10",
              setName: null,
              face: { background: null, foreground: null },
              materials: [{ itemId: 2, quantity: 3 }],
            },
            {
              id: 11,
              name: "创想卡 11",
              setName: null,
              face: { background: null, foreground: null },
              materials: null,
            },
          ],
        },
        second,
      ],
    };
    expect(furnitureDetail(recipeData, "items", 1)).toMatchObject({
      recipes: [
        { id: 10, materials: [{ itemId: 2, quantity: 3, item: { name: "木桌" } }] },
        { id: 11, materials: null },
      ],
    });
  });
  it("uses the product icon for the card face and falls back to the card icon", async () => {
    const background = { file: `assets/${"c".repeat(64)}.webp`, width: 390, height: 560 };
    const foreground = `assets/${"d".repeat(64)}.webp`;
    const productIcon = `assets/${"e".repeat(64)}.webp`;
    for (const image of [productIcon, null]) {
      const fixture = catalogFixture({
        furniture: {
          ...data,
          items: [
            {
              ...first,
              image,
              creationCards: [
                {
                  id: 10,
                  name: "创想卡：木椅",
                  setName: null,
                  materials: null,
                  face: { background, foreground },
                },
              ],
            },
          ],
          sets: [],
        },
      });
      vi.stubGlobal("fetch", vi.fn(fixtureRequest(fixture)));
      expect(await loadFurnitureDetail("items", "1")).toMatchObject({
        recipes: [
          {
            name: "创想卡：木椅",
            face: {
              background: { file: background.file },
              foreground: image ?? foreground,
            },
          },
        ],
      });
    }
  });
  it("preserves member order and distinguishes unavailable from empty members", () => {
    expect(furnitureDetail(data, "sets", 3)).toMatchObject({ items: [second, first] });
    expect(
      furnitureDetail({ ...data, sets: [{ ...set, componentIds: null }] }, "sets", 3),
    ).toMatchObject({ items: null });
    expect(
      furnitureDetail({ ...data, sets: [{ ...set, componentIds: [] }] }, "sets", 3),
    ).toMatchObject({ items: [] });
  });
  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["sets", 1],
      ["items", 999],
    ] as const) {
      try {
        furnitureDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("loads real schema data and keeps network or validation failures retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ furniture: data }))));
    expect(await loadFurnitureDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadFurnitureDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadFurnitureDetail("items", "1")).rejects.toThrow();
  });
});
