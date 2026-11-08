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
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantSummaryFixture,
  plantsDataFixture,
} from "./fixture";
import type { PlantItem, PlantSeries } from "../collection-view.ts";
import { plantsDetail, loadPlantsDetail, parsePlantId } from "./detail";
import { cropDetailSearchSchema, matureCropStage, selectedCropTab } from "./crop-detail";
import { ingredientsFixture } from "../ingredients/fixture";
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
  it("keeps each crop product's cooking uses separate in a single series detail", () => {
    const items = [1, 4, 8].map((id) => plantItemFixture({ id, category: "作物" }));
    const series = plantSeriesFixture({ id: 100, plantIds: [4, 1, 8] });
    const detail = plantsDetail(
      plantsDataFixture({ items, series: [series] }),
      "series",
      100,
      ingredientsFixture().data,
    );
    if (detail.kind !== "crop") throw new Error("Expected crop detail");
    expect(detail.items.map((item) => item.id)).toEqual([4, 1, 8]);
    expect(detail.cookingByItemId.get(4)?.dishes.map((match) => match.dish.id)).toEqual([102]);
    expect(detail.cookingByItemId.get(1)?.dishes.map((match) => match.dish.id)).toEqual([
      100, 102, 109,
    ]);
    expect(detail.cookingByItemId.get(8)).toBeNull();
  });
  it("groups a crop seed and its ordered products under the series detail", () => {
    const crop = plantItemFixture({ id: 6, name: "星露作物", category: "作物", cropSeriesId: 7 });
    const seed = plantSeedFixture({ id: 8, name: "星露种子", cropSeriesId: 7, plantIds: [6] });
    const cropSeries = plantSeriesFixture({
      id: 7,
      name: "星露作物系列",
      plantIds: [6],
      summary: plantSummaryFixture({ seeds: [seed] }),
    });
    const cropData = plantsDataFixture({ items: [crop], series: [cropSeries], seeds: [seed] });
    const detail = plantsDetail(cropData, "series", 7);

    expect(detail).toMatchObject({
      kind: "crop",
      record: cropSeries,
      items: [crop],
      seeds: [seed],
    });
    expect(() => plantsDetail(cropData, "items", 6)).toThrow();
  });

  it("selects only valid series product tabs and resolves mature forms by product ID", () => {
    const growth = {
      id: 8,
      kind: "crop" as const,
      cycleMode: null,
      initialStageIds: [11],
      regrowthStageIds: null,
      stages: [
        { id: 11, name: "作物株", image: "first", plantId: 6 },
        { id: 12, name: "作物株", image: "second", plantId: 9 },
      ],
      matureStages: [
        { stageId: 11, tag: null, rank: null },
        { stageId: 12, tag: null, rank: null },
      ],
      witheredStageId: null,
      maturityDays: null,
      harvestCount: null,
    };
    const items = [plantItemFixture({ id: 6 }), plantItemFixture({ id: 9 })];
    expect(selectedCropTab("item-9", items)).toBe("item-9");
    expect(selectedCropTab("item-99", items)).toBe("seed");
    expect(selectedCropTab("item-x", items)).toBe("seed");
    expect(matureCropStage(growth, 9)?.image).toBe("second");
    expect(cropDetailSearchSchema.parse({ tab: "invalid" })).toEqual({ tab: undefined });
  });

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
    vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture({ plants: data }))));
    expect(await loadPlantsDetail("items", "1")).toMatchObject({ record: { id: 1 } });
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
    validateSearch: cropDetailSearchSchema,
    loader: ({ params }) => plantsDetail(data, "series", parsePlantId(params.id)),
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries }),
    routeTree: root.addChildren([list, item, seriesRoute]),
  });
}

async function pushMemoryLocation(
  router: ReturnType<typeof setup>,
  href: string,
  state = router.state.location.state,
) {
  router.history.push(href, state);
  await router.load();
}

describe("plant detail navigation", () => {
  it("shares product tabs and preserves origin state through history navigation", async () => {
    const router = setup([
      "/collection/plants?view=seeds&seeds=%7B%22q%22%3A%22%E7%95%AA%E8%8C%84%22%7D",
    ]);
    await router.load();
    const original = router.state.location;
    await pushMemoryLocation(router, "/collection/plants/series/3", {
      ...original.state,
      plantsOrigin: plantsOrigin(original),
    });
    const seedHref = router.state.location.href;
    await pushMemoryLocation(router, "/collection/plants/series/3?tab=item-2");
    expect(router.state.location.search).toEqual({ tab: "item-2" });
    expect(plantsOrigin(router.state.location)).toEqual(plantsOrigin(original));
    router.history.back();
    await router.load();
    expect(router.state.location.href).toBe(seedHref);
    router.history.forward();
    await router.load();
    expect(router.state.location.search).toEqual({ tab: "item-2" });
    const origin = plantsOrigin(router.state.location)!;
    router.history.go(origin.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(original.href);
    expect(router.state.location.state.__TSR_key).toBe(original.state.__TSR_key);
  });

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
    await pushMemoryLocation(router, "/collection/plants/items/1", {
      ...router.state.location.state,
      plantsOrigin: origin,
    });
    await pushMemoryLocation(router, "/collection/plants/series/3", {
      ...router.state.location.state,
      plantsOrigin: plantsOrigin(router.state.location),
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
