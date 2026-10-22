import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isNotFound,
  defaultParseSearch,
} from "@tanstack/react-router";
import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { emptyContent } from "@loomix/content-schema";
import type { ClothingItem, ClothingSet } from "@loomix/content-schema";
import { clothingDetail, loadClothingDetail, parseClothingId } from "./detail";
import { clothingOrigin } from "./detail-navigation";
import { clothingSearchSchema, compactClothingSearchMiddleware } from "./search";

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
  sources: null,
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
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ ...emptyContent(), clothing: data }))),
    );
    expect(await loadClothingDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadClothingDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadClothingDetail("items", "1")).rejects.toThrow();
  });
});

function setup(initialEntries: string[]) {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/clothing",
    validateSearch: clothingSearchSchema,
    search: { middlewares: [compactClothingSearchMiddleware] },
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/collection/clothing/items/$id",
    loader: ({ params }) => clothingDetail(data, "items", parseClothingId(params.id)),
  });
  const appearance = createRoute({
    getParentRoute: () => root,
    path: "/collection/clothing/appearances/$id",
    loader: ({ params }) => clothingDetail(data, "appearances", parseClothingId(params.id)),
  });
  const suite = createRoute({
    getParentRoute: () => root,
    path: "/collection/clothing/sets/$id",
    loader: ({ params }) => clothingDetail(data, "sets", parseClothingId(params.id)),
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, item, suite, appearance]),
  });
}

describe("detail navigation", () => {
  it("opens direct and refreshed detail addresses without a list origin", async () => {
    for (const href of [
      "/collection/clothing/items/1",
      "/collection/clothing/sets/3",
      "/collection/clothing/appearances/5",
    ]) {
      const router = setup([href]);
      await router.load();
      expect(router.state.matches.at(-1)?.status).toBe("success");
      expect(clothingOrigin(router.state.location)).toBeUndefined();
      expect(router.state.matches).toHaveLength(2);
    }
  });
  it("preserves the original filtered list across related details and history return", async () => {
    const router = setup(["/collection/clothing?items=%7B%22q%22%3A%22木%22%7D"]);
    await router.load();
    const original = router.state.location;
    const origin = clothingOrigin(original);
    await router.navigate({
      to: "/collection/clothing/items/$id",
      params: { id: "1" },
      state: { clothingOrigin: origin },
    });
    expect(clothingOrigin(router.state.location)).toEqual(origin);
    await router.navigate({
      to: "/collection/clothing/sets/$id",
      params: { id: "3" },
      state: { clothingOrigin: clothingOrigin(router.state.location) },
    });
    const retained = clothingOrigin(router.state.location)!;
    expect(defaultParseSearch(retained.href.split("?")[1])).toEqual({ items: { q: "木" } });
    router.history.go(retained.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(original.href);
    expect(router.state.location.state.__TSR_key).toBe(original.state.__TSR_key);
  });
  it("ignores origins that cannot refer to an earlier clothing list", async () => {
    const router = setup(["/collection/clothing/items/1"]);
    await router.load();
    const location = router.state.location;
    for (const origin of [
      { href: "https://example.com", index: 0 },
      { href: "/collection/clothing", index: 100 },
      { href: "/collection/clothing/items/2", index: 0 },
    ]) {
      expect(
        clothingOrigin({ ...location, state: { ...location.state, clothingOrigin: origin } }),
      ).toBeUndefined();
    }
  });
});
