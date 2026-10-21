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
import type { FurnitureItem, FurnitureSet } from "@loomix/content-schema";
import { furnitureDetail, loadFurnitureDetail, parseFurnitureId } from "./detail";
import { furnitureOrigin } from "./detail-navigation";
import { furnitureSearchSchema, compactFurnitureSearchMiddleware } from "./search";

const first: FurnitureItem = {
  id: 1,
  name: "木椅",
  image: null,
  quality: null,
  description: null,
  category: null,
  type: null,
  size: null,
  colors: null,
  materials: null,
  sources: null,
};
const second: FurnitureItem = { ...first, id: 2, name: "木桌" };
const set: FurnitureSet = {
  id: 3,
  name: "木制套装",
  image: null,
  quality: null,
  description: null,
  seriesName: null,
  componentIds: [2, 1],
};
const data = { items: [first, second], sets: [set, { ...set, id: 4, componentIds: [1] }] };

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
    });
    expect(furnitureDetail({ ...data, sets: [] }, "items", 1)).toMatchObject({ sets: [] });
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
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ ...emptyContent(), furniture: data }))),
    );
    expect(await loadFurnitureDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadFurnitureDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadFurnitureDetail("items", "1")).rejects.toThrow();
  });
});

function setup(initialEntries: string[]) {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture",
    validateSearch: furnitureSearchSchema,
    search: { middlewares: [compactFurnitureSearchMiddleware] },
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture/items/$id",
    loader: ({ params }) => furnitureDetail(data, "items", parseFurnitureId(params.id)),
  });
  const suite = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture/sets/$id",
    loader: ({ params }) => furnitureDetail(data, "sets", parseFurnitureId(params.id)),
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, item, suite]),
  });
}

describe("detail navigation", () => {
  it("opens direct and refreshed detail addresses without a list origin", async () => {
    for (const href of ["/collection/furniture/items/1", "/collection/furniture/sets/3"]) {
      const router = setup([href]);
      await router.load();
      expect(router.state.matches.at(-1)?.status).toBe("success");
      expect(furnitureOrigin(router.state.location)).toBeUndefined();
      expect(router.state.matches).toHaveLength(2);
    }
  });
  it("preserves the original filtered list across related details and history return", async () => {
    const router = setup(["/collection/furniture?items=%7B%22q%22%3A%22木%22%7D"]);
    await router.load();
    const original = router.state.location;
    const origin = furnitureOrigin(original);
    await router.navigate({
      to: "/collection/furniture/items/$id",
      params: { id: "1" },
      state: { furnitureOrigin: origin },
    });
    expect(furnitureOrigin(router.state.location)).toEqual(origin);
    await router.navigate({
      to: "/collection/furniture/sets/$id",
      params: { id: "3" },
      state: { furnitureOrigin: furnitureOrigin(router.state.location) },
    });
    const retained = furnitureOrigin(router.state.location)!;
    expect(defaultParseSearch(retained.href.split("?")[1])).toEqual({ items: { q: "木" } });
    router.history.go(retained.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(original.href);
    expect(router.state.location.state.__TSR_key).toBe(original.state.__TSR_key);
  });
  it("ignores origins that cannot refer to an earlier furniture list", async () => {
    const router = setup(["/collection/furniture/items/1"]);
    await router.load();
    const location = router.state.location;
    for (const origin of [
      { href: "https://example.com", index: 0 },
      { href: "/collection/furniture", index: 100 },
      { href: "/collection/furniture/items/2", index: 0 },
    ]) {
      expect(
        furnitureOrigin({ ...location, state: { ...location.state, furnitureOrigin: origin } }),
      ).toBeUndefined();
    }
  });
});
