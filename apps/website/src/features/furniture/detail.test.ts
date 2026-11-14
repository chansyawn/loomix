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
  craftingRecipes: null,
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
      cropSeriesId: null,
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
      cropSeriesId: null,
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
  it("shows all memberships and preserves missing item fields", () => {
    expect(furnitureDetail(data, "items", 1)).toEqual({
      kind: "item",
      record: first,
      sets: data.sets,
      sameSetItems: [second],
      recipes: null,
    });
    expect(furnitureDetail({ ...data, sets: [] }, "items", 1)).toMatchObject({
      sets: [],
      sameSetItems: [],
    });
  });
  it("lists each same-set item once across overlapping memberships", () => {
    const third = { ...first, id: 5, name: "木凳" };
    const overlapping = {
      ...data,
      items: [...data.items, third],
      sets: [
        { ...set, componentIds: [5, 2, 1] },
        { ...set, id: 4, componentIds: [2, 5] },
      ],
    };
    expect(furnitureDetail(overlapping, "items", 1)).toMatchObject({
      sameSetItems: [third, second],
    });
  });
  it("resolves crafting materials and preserves unconfirmed recipe reasons", () => {
    const recipeData = {
      ...data,
      items: [
        {
          ...first,
          craftingRecipes: [
            { id: 10, materials: [{ itemId: 2, quantity: 3 }], unresolvedReason: null },
            { id: 11, materials: null, unresolvedReason: "材料信息尚未确认" },
          ],
        },
        second,
      ],
    };
    expect(furnitureDetail(recipeData, "items", 1)).toMatchObject({
      recipes: [
        { id: 10, materials: [{ itemId: 2, quantity: 3, item: { name: "木桌" } }] },
        { id: 11, materials: null, unresolvedReason: "材料信息尚未确认" },
      ],
    });
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
