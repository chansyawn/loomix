import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { compactPlantsSearch, compactPlantsSearchMiddleware, plantsSearchSchema } from "./search";

function setup(initialEntry = "/plants") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const plants = createRoute({
    getParentRoute: () => root,
    path: "/plants",
    validateSearch: plantsSearchSchema,
    search: { middlewares: [compactPlantsSearchMiddleware] },
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: root.addChildren([plants]),
  });
}

describe("compact plant URLs", () => {
  it("omits defaults and serializes only meaningful view fields", () => {
    const router = setup();
    const empty = router.buildLocation({
      to: "/plants",
      from: "/plants",
      search: plantsSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/plants");
    const selected = router.buildLocation({
      to: "/plants",
      from: "/plants",
      search: plantsSearchSchema.parse({
        items: { q: "花", galaxies: ["禾夏"], harvestCounts: ["2"] },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "花", galaxies: ["禾夏"], harvestCounts: ["2"] },
    });
  });

  it("round trips encoded text and compacts idempotently", () => {
    const search = plantsSearchSchema.parse({
      view: "series",
      items: { q: '花 & + # ? "', categories: ["作物"], series: ["__ungrouped"] },
      series: {
        q: "春系列",
        qualities: ["__missing", "2"],
        sort: "name-asc",
        flowerColors: ["白色"],
      },
      seeds: {
        q: "种子",
        series: ["95000", "__ungrouped"],
        harvestCounts: ["3", "__missing"],
        sort: "name-desc",
      },
    });
    const compact = compactPlantsSearch(search);
    const restored = plantsSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)));
    expect(restored).toEqual(search);
    expect(compactPlantsSearch(compact)).toEqual(compact);
  });

  it("serializes the seed view and its supported filters", () => {
    const router = setup();
    const search = plantsSearchSchema.parse({
      view: "seeds",
      seeds: {
        q: "番茄",
        series: ["95000"],
        harvestCounts: ["3"],
      },
    });
    const location = router.buildLocation({ to: "/plants", search });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      view: "seeds",
      seeds: {
        q: "番茄",
        series: ["95000"],
        harvestCounts: ["3"],
      },
    });
  });

  it("切换植株与种子时保留各自查询，共用表格布局", () => {
    const router = setup();
    const initial = plantsSearchSchema.parse({
      view: "harvestablePlants",
      layout: "table",
      harvestablePlants: { categories: ["花株"], sort: "quality-desc" },
      seeds: { q: "番茄" },
    });
    const href = (search: typeof initial) => router.buildLocation({ to: "/plants", search });
    const seeds = plantsSearchSchema.parse(
      defaultParseSearch(href({ ...initial, view: "seeds" }).searchStr),
    );
    expect(seeds.layout).toBe("table");
    expect(seeds.seeds.q).toBe("番茄");
    expect(href({ ...seeds, view: "harvestablePlants" }).href).toBe(href(initial).href);
    expect(href(plantsSearchSchema.parse({ view: "harvestablePlants" })).href).toBe(
      "/plants?view=harvestablePlants",
    );
  });

  it("preserves parent parameters and removes unsupported nested values", async () => {
    const router = setup(
      `/plants${defaultStringifySearch({
        lang: "zh",
        items: { categories: ["作物"], page: 4 },
        seeds: { categories: ["作物"], series: ["95000"], acquisition: ["星屿探索"], page: 4 },
      })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/plants",
      from: "/plants",
      search: (previous) => ({ ...previous, ...plantsSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { categories: ["作物"] },
      seeds: { series: ["95000"] },
    });
  });
});

describe("layout URL overrides", () => {
  it.each(["grid", "table"] as const)(
    "preserves explicit %s layout through URLs and query updates",
    (layout) => {
      const router = setup();
      const search = plantsSearchSchema.parse({ layout, items: { q: "测试" } });
      const compact = compactPlantsSearch(search);
      expect(plantsSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
        search,
      );
      const location = router.buildLocation({ to: "/plants", search });
      expect(defaultParseSearch(location.searchStr)).toMatchObject({ layout });
      const cleared = router.buildLocation({
        to: "/plants",
        search: plantsSearchSchema.parse({ ...search, items: {} }),
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    },
  );
  it("omits absent and malformed layouts so local preferences can apply", () => {
    for (const layout of [undefined, null, "bad", 42, []]) {
      const parsed = plantsSearchSchema.parse({ layout });
      expect(parsed.layout).toBeUndefined();
      expect(compactPlantsSearch(parsed).layout).toBeUndefined();
    }
  });
});
