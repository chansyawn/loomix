import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../omnidex-fixture.ts";
import type { ClothingItem, ClothingOutfit } from "../omnidex-view.ts";
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
};
const second: ClothingItem = { ...first, id: 2, name: "木桌" };
const set: ClothingOutfit = {
  id: 3,
  name: "木制套装",
  image: null,
  quality: null,
  description: null,
  outfitName: null,
  componentIds: [2, 1],
};
const data = {
  appearances: [
    { id: 5, name: "卷发", image: null, quality: null, description: null, category: "发型" },
  ],
  items: [first, second],
  outfits: [set, { ...set, id: 4, componentIds: [1] }],
  neighborOutfit: [],
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
  it("单品保留自身字段，无套装时不生成切换项", () => {
    expect(clothingDetail(data, "items", 1)).toMatchObject({
      kind: "item",
      record: first,
    });
    expect(clothingDetail({ ...data, outfits: [] }, "items", 1).navigation.groups).toEqual([]);
  });
  it("preserves member order and distinguishes unavailable from empty members", () => {
    expect(clothingDetail(data, "outfits", 3)).toMatchObject({ items: [second, first] });
    expect(
      clothingDetail({ ...data, outfits: [{ ...set, componentIds: null }] }, "outfits", 3),
    ).toMatchObject({ items: null });
    expect(
      clothingDetail({ ...data, outfits: [{ ...set, componentIds: [] }] }, "outfits", 3),
    ).toMatchObject({ items: [] });
  });
  it("shows appearances independently from clothing items", () => {
    expect(clothingDetail(data, "appearances", 5)).toEqual({
      kind: "appearance",
      record: data.appearances[0],
      navigation: { groups: [] },
    });
  });
  it("服饰详情与套装详情都接入同组切换，多个套装分别保留", () => {
    const item = clothingDetail(data, "items", 1);
    expect(item.navigation.groups.map((group) => group.entries.map((entry) => entry.id))).toEqual([
      [3, 2, 1],
      [4, 1],
    ]);
    expect(clothingDetail(data, "outfits", 3).navigation.groups).toEqual([
      item.navigation.groups[0],
    ]);
  });
  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["outfits", 1],
      ["items", 999],
      ["appearances", 1],
      ["outfits", 5],
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
