import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  isNotFound,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { catalogFixture } from "../collection-fixture.ts";
import { plantItemFixture, plantSeriesFixture, plantsDataFixture } from "./fixture";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import { plantsDetail, loadPlantsDetail, parsePlantId } from "./detail";
import { plantsOrigin } from "./detail-navigation";
import { compactPlantsSearchMiddleware, plantsSearchSchema } from "./search";

const first: PlantItem = plantItemFixture({
  id: 1,
  name: "星露花",
  image: null,
  description: null,
  quality: null,
  category: null,
  originGalaxy: null,
  maturityPeriod: null,
  harvestCount: null,
});
const second: PlantItem = { ...first, id: 2, name: "星露果" };
const group: PlantSeries = plantSeriesFixture({
  id: 3,
  name: "星露系列",
  image: null,
  description: null,
  quality: null,
  seriesName: null,
  plantIds: [2, 1],
});
const data = plantsDataFixture({
  items: [first, second],
  series: [
    group,
    { ...group, id: 4, name: "空系列", plantIds: [] },
    { ...group, id: 5, plantIds: null },
  ],
});

afterEach(() => vi.unstubAllGlobals());

describe("plant details", () => {
  it("accepts positive safe integer IDs and rejects malformed addresses", () => {
    expect(parsePlantId("1")).toBe(1);
    for (const value of ["0", "-1", "1.5", "1e2", "01", "", "abc", "9007199254740992"]) {
      try {
        parsePlantId(value);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("returns known series memberships and preserves missing plant fields", () => {
    expect(plantsDetail(data, "items", 1)).toMatchObject({
      kind: "item",
      record: first,
      series: [group],
      hasUnconfirmedSeriesMembership: true,
    });
    expect(plantsDetail({ ...data, series: [] }, "items", 1)).toMatchObject({ series: [] });
    expect(
      plantsDetail({ ...data, items: [first], series: [{ ...group, plantIds: null }] }, "items", 1),
    ).toMatchObject({ series: [], hasUnconfirmedSeriesMembership: true });
  });

  it("preserves member order and distinguishes unknown members from an empty list", () => {
    expect(plantsDetail(data, "series", 3)).toMatchObject({ items: [second, first] });
    expect(plantsDetail(data, "series", 4)).toMatchObject({ items: [] });
    expect(plantsDetail(data, "series", 5)).toMatchObject({ items: null });
  });

  it("treats missing records and IDs of the wrong kind as not found", () => {
    for (const [view, id] of [
      ["items", 3],
      ["series", 1],
      ["items", 999],
    ] as const) {
      try {
        plantsDetail(data, view, id);
        throw new Error("Expected not found");
      } catch (error) {
        expect(isNotFound(error)).toBe(true);
      }
    }
  });

  it("loads validated content and keeps network or schema failures retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(catalogFixture({ plants: data })))),
    );
    expect(await loadPlantsDetail("items", "1")).toMatchObject({ record: first });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(loadPlantsDetail("items", "1")).rejects.toThrow("503");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(loadPlantsDetail("items", "1")).rejects.toThrow();
  });
});

function setup(initialEntries: string[]) {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/plants",
    validateSearch: plantsSearchSchema,
    search: { middlewares: [compactPlantsSearchMiddleware] },
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/collection/plants/items/$id",
    loader: ({ params }) => plantsDetail(data, "items", parsePlantId(params.id)),
  });
  const seriesRoute = createRoute({
    getParentRoute: () => root,
    path: "/collection/plants/series/$id",
    loader: ({ params }) => plantsDetail(data, "series", parsePlantId(params.id)),
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, item, seriesRoute]),
  });
}

describe("plant detail navigation", () => {
  it("opens direct detail addresses without requiring a list origin", async () => {
    for (const href of ["/collection/plants/items/1", "/collection/plants/series/3"]) {
      const router = setup([href]);
      await router.load();
      expect(router.state.matches.at(-1)?.status).toBe("success");
      expect(plantsOrigin(router.state.location)).toBeUndefined();
      expect(router.state.matches).toHaveLength(2);
    }
  });

  it("returns through related details to the original filtered list", async () => {
    const router = setup(["/collection/plants?items=%7B%22q%22%3A%22花%22%7D"]);
    await router.load();
    const original = router.state.location;
    const origin = plantsOrigin(original);
    await router.navigate({
      to: "/collection/plants/items/$id",
      params: { id: "1" },
      state: { plantsOrigin: origin },
    });
    await router.navigate({
      to: "/collection/plants/series/$id",
      params: { id: "3" },
      state: { plantsOrigin: plantsOrigin(router.state.location) },
    });
    const retained = plantsOrigin(router.state.location)!;
    expect(defaultParseSearch(retained.href.split("?")[1])).toEqual({ items: { q: "花" } });
    router.history.go(retained.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(original.href);
    expect(router.state.location.state.__TSR_key).toBe(original.state.__TSR_key);
  });

  it("ignores origins that do not point to an earlier plant list", async () => {
    const router = setup(["/collection/plants/items/1"]);
    await router.load();
    const location = router.state.location;
    for (const origin of [
      { href: "https://example.com", index: 0 },
      { href: "/collection/plants", index: 100 },
      { href: "/collection/plants/items/2", index: 0 },
    ]) {
      expect(
        plantsOrigin({ ...location, state: { ...location.state, plantsOrigin: origin } }),
      ).toBeUndefined();
    }
  });
});
