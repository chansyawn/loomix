import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture.ts";
import type { ClothingItem, ClothingSet } from "../collection-view.ts";
import { clothingDetail, loadClothingDetail, parseClothingId } from "./detail";

const first: ClothingItem = {
  id: 1,
  name: "木椅",
  image: null,
  quality: null,
  description: null,
  category: null,
  styles: null,
  colors: null,
  materials: null,
  acquisition: null,
};
const second: ClothingItem = { ...first, id: 2, name: "木桌" };
const set: ClothingSet = {
  id: 3,
  name: "木制套装",
  image: null,
  quality: null,
  description: null,
  setName: null,
  componentIds: [2, 1],
};
const data = {
  appearances: [
    { id: 5, name: "卷发", image: null, quality: null, description: null, category: "发型" },
  ],
  items: [first, second],
  sets: [set, { ...set, id: 4, componentIds: [1] }],
};

afterEach(() => vi.unstubAllGlobals());

describe("clothing details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseClothingId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseClothingId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("shows all memberships and preserves missing item fields", () => {
    expect(clothingDetail(data, "items", 1)).toEqual({
      kind: "item",
      record: first,
      sets: data.sets,
    });
    expect(clothingDetail({ ...data, sets: [] }, "items", 1)).toMatchObject({ sets: [] });
  });
  it("preserves member order and distinguishes unavailable from empty members", () => {
    expect(clothingDetail(data, "sets", 3)).toMatchObject({ items: [second, first] });
    expect(
      clothingDetail({ ...data, sets: [{ ...set, componentIds: null }] }, "sets", 3),
    ).toMatchObject({ items: null });
    expect(
      clothingDetail({ ...data, sets: [{ ...set, componentIds: [] }] }, "sets", 3),
    ).toMatchObject({ items: [] });
  });
  it("shows appearances independently from clothing items", () => {
    expect(clothingDetail(data, "appearances", 5)).toEqual({
      kind: "appearance",
      record: data.appearances[0],
    });
  });
  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["sets", 1],
      ["items", 999],
      ["appearances", 1],
      ["sets", 5],
    ] as const) {
      try {
        clothingDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("loads real schema data and keeps network or validation failures retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ clothing: data }))));
    expect(await loadClothingDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadClothingDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadClothingDetail("items", "1")).rejects.toThrow();
  });
});
