import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  isNotFound,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { catalogFixture, fixtureRequest } from "../collection-fixture.ts";
import type { DishItem, DishSeries } from "../collection-view.ts";
import { dishesDetail, loadDishesDetail, parseDishId } from "./detail";
import { dishesOrigin } from "./detail-navigation";
import { compactDishesSearchMiddleware, dishesSearchSchema } from "./search";

const first: DishItem = {
  id: 1,
  name: "星露烤鱼",
  image: null,
  description: "香气浓郁",
  quality: 2,
  difficulty: "中等",
  galaxyFlavor: "星屿，禾夏",
  cookware: "烤架",
  effects: "耐力上限提升 5 点",
  recipe: null,
};
const second: DishItem = { ...first, id: 2, name: "星露蒸鱼" };
const group: DishSeries = {
  id: 3,
  name: "星露系列",
  image: null,
  description: null,
  quality: null,
  seriesName: "河鲜",
  dishIds: [2, 1],
};
const data = {
  items: [first, second],
  series: [
    group,
    { ...group, id: 4, name: "空系列", dishIds: [] },
    { ...group, id: 5, name: "未知系列", dishIds: null },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe("dish details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parseDishId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parseDishId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("returns known series memberships and reports incomplete membership data", () => {
    expect(dishesDetail(data, "items", 1)).toEqual({
      kind: "item",
      record: first,
      ingredientCategoriesById: new Map(),
      ingredientItemsById: new Map(),
      series: [group],
      hasUnconfirmedSeriesMembership: true,
    });
    expect(dishesDetail({ ...data, series: [] }, "items", 1)).toMatchObject({ series: [] });
    expect(
      dishesDetail({ items: [first], series: [{ ...group, dishIds: null }] }, "items", 1),
    ).toMatchObject({ series: [], hasUnconfirmedSeriesMembership: true });
  });

  it("preserves member order and distinguishes unknown members from an empty series", () => {
    expect(dishesDetail(data, "series", 3)).toMatchObject({ items: [second, first] });
    expect(dishesDetail(data, "series", 4)).toMatchObject({ items: [] });
    expect(dishesDetail(data, "series", 5)).toMatchObject({ items: null });
  });

  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["series", 1],
      ["items", 999],
    ] as const) {
      try {
        dishesDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("loads validated content and keeps network or schema failures retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ dishes: data }))));
    expect(await loadDishesDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadDishesDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadDishesDetail("items", "1")).rejects.toThrow();
  });
});

function setup(initialEntries: string[]) {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/dishes",
    validateSearch: dishesSearchSchema,
    search: { middlewares: [compactDishesSearchMiddleware] },
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/collection/dishes/items/$id",
    loader: ({ params }) => dishesDetail(data, "items", parseDishId(params.id)),
  });
  const seriesRoute = createRoute({
    getParentRoute: () => root,
    path: "/collection/dishes/series/$id",
    loader: ({ params }) => dishesDetail(data, "series", parseDishId(params.id)),
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, item, seriesRoute]),
  });
}

describe("dish detail navigation", () => {
  it("opens direct detail addresses without requiring a list origin", async () => {
    for (const href of ["/collection/dishes/items/1", "/collection/dishes/series/3"]) {
      const router = setup([href]);
      await router.load();
      expect(router.state.matches.at(-1)?.status).toBe("success");
      expect(dishesOrigin(router.state.location)).toBeUndefined();
      expect(router.state.matches).toHaveLength(2);
    }
  });

  it("retains the original filtered list through related detail navigation", async () => {
    const router = setup(["/collection/dishes?items=%7B%22q%22%3A%22%E9%B1%BC%22%7D"]);
    await router.load();
    const original = router.state.location;
    const origin = dishesOrigin(original);
    await router.navigate({
      to: "/collection/dishes/items/$id",
      params: { id: "1" },
      state: { dishesOrigin: origin },
    });
    await router.navigate({
      to: "/collection/dishes/series/$id",
      params: { id: "3" },
      state: { dishesOrigin: dishesOrigin(router.state.location) },
    });
    const retained = dishesOrigin(router.state.location)!;
    expect(defaultParseSearch(retained.href.split("?")[1])).toEqual({ items: { q: "鱼" } });
    router.history.go(retained.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(original.href);
    expect(router.state.location.state.__TSR_key).toBe(original.state.__TSR_key);
  });

  it("ignores origins that do not point to an earlier dish list", async () => {
    const router = setup(["/collection/dishes/items/1"]);
    await router.load();
    const location = router.state.location;
    for (const origin of [
      { href: "https://example.com", index: 0 },
      { href: "/collection/dishes", index: 100 },
      { href: "/collection/dishes/items/2", index: 0 },
    ]) {
      expect(
        dishesOrigin({ ...location, state: { ...location.state, dishesOrigin: origin } }),
      ).toBeUndefined();
    }
  });
});
