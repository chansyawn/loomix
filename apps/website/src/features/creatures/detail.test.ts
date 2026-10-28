import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isNotFound,
  defaultParseSearch,
} from "@tanstack/react-router";
import { describe, expect, it, vi, afterEach } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture.ts";
import type { CreatureItem, CreatureSeries } from "../collection-view.ts";
import { creaturesDetail, loadCreaturesDetail, parseCreaturesId } from "./detail";
import { creaturesOrigin } from "./detail-navigation";
import { creaturesSearchSchema, compactCreaturesSearchMiddleware } from "./search";

const first: CreatureItem = {
  id: 1,
  name: "草鱼",
  image: null,
  quality: null,
  description: null,
  category: null,
  scientificName: null,
  sources: null,
  region: null,
  habitat: null,
  activeSeasons: null,
  activeTimes: null,
  activeWeather: null,
  sizeRange: null,
};
const second: CreatureItem = { ...first, id: 2, name: "青鱼" };
const group: CreatureSeries = {
  id: 3,
  name: "河川鱼类",
  image: null,
  quality: null,
  description: null,
  seriesName: null,
  creatureIds: [2, 1],
};
const data = { items: [first, second], series: [group, { ...group, id: 4, creatureIds: [1] }] };

afterEach(() => vi.unstubAllGlobals());

describe("creatures details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseCreaturesId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseCreaturesId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("shows all memberships and preserves missing item fields", () => {
    expect(creaturesDetail(data, "items", 1)).toEqual({
      kind: "item",
      record: first,
      cooking: null,
      catalogItems: data.items,
      series: data.series,
    });
    expect(creaturesDetail({ ...data, series: [] }, "items", 1)).toMatchObject({ series: [] });
  });
  it("preserves member order and distinguishes unavailable from empty members", () => {
    expect(creaturesDetail(data, "series", 3)).toMatchObject({ items: [second, first] });
    expect(
      creaturesDetail({ ...data, series: [{ ...group, creatureIds: null }] }, "series", 3),
    ).toMatchObject({ items: null });
    expect(
      creaturesDetail({ ...data, series: [{ ...group, creatureIds: [] }] }, "series", 3),
    ).toMatchObject({ items: [] });
  });
  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["series", 1],
      ["items", 999],
    ] as const) {
      try {
        creaturesDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });
  it("loads real schema data and keeps network or validation failures retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ creatures: data }))));
    expect(await loadCreaturesDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadCreaturesDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadCreaturesDetail("items", "1")).rejects.toThrow();
  });
});

function setup(initialEntries: string[]) {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/creatures",
    validateSearch: creaturesSearchSchema,
    search: { middlewares: [compactCreaturesSearchMiddleware] },
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/collection/creatures/items/$id",
    loader: ({ params }) => creaturesDetail(data, "items", parseCreaturesId(params.id)),
  });
  const seriesRoute = createRoute({
    getParentRoute: () => root,
    path: "/collection/creatures/series/$id",
    loader: ({ params }) => creaturesDetail(data, "series", parseCreaturesId(params.id)),
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, item, seriesRoute]),
  });
}

describe("detail navigation", () => {
  it("opens direct and refreshed detail addresses without a list origin", async () => {
    for (const href of ["/collection/creatures/items/1", "/collection/creatures/series/3"]) {
      const router = setup([href]);
      await router.load();
      expect(router.state.matches.at(-1)?.status).toBe("success");
      expect(creaturesOrigin(router.state.location)).toBeUndefined();
      expect(router.state.matches).toHaveLength(2);
    }
  });
  it("preserves the original filtered list across related details and history return", async () => {
    const router = setup(["/collection/creatures?items=%7B%22q%22%3A%22鱼%22%7D"]);
    await router.load();
    const original = router.state.location;
    const origin = creaturesOrigin(original);
    await router.navigate({
      to: "/collection/creatures/items/$id",
      params: { id: "1" },
      state: { creaturesOrigin: origin },
    });
    expect(creaturesOrigin(router.state.location)).toEqual(origin);
    await router.navigate({
      to: "/collection/creatures/series/$id",
      params: { id: "3" },
      state: { creaturesOrigin: creaturesOrigin(router.state.location) },
    });
    const retained = creaturesOrigin(router.state.location)!;
    expect(defaultParseSearch(retained.href.split("?")[1])).toEqual({ items: { q: "鱼" } });
    router.history.go(retained.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(original.href);
    expect(router.state.location.state.__TSR_key).toBe(original.state.__TSR_key);
  });
  it("ignores origins that cannot refer to an earlier creatures list", async () => {
    const router = setup(["/collection/creatures/items/1"]);
    await router.load();
    const location = router.state.location;
    for (const origin of [
      { href: "https://example.com", index: 0 },
      { href: "/collection/creatures", index: 100 },
      { href: "/collection/creatures/items/2", index: 0 },
    ]) {
      expect(
        creaturesOrigin({ ...location, state: { ...location.state, creaturesOrigin: origin } }),
      ).toBeUndefined();
    }
  });
});
