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

function setup(initialEntry = "/collection/plants") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const plants = createRoute({
    getParentRoute: () => root,
    path: "/collection/plants",
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
      to: "/collection/plants",
      from: "/collection/plants",
      search: plantsSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/collection/plants");
    const selected = router.buildLocation({
      to: "/collection/plants",
      from: "/collection/plants",
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
      series: { q: "春系列", qualities: ["__missing", "2"], sort: "name-asc" },
    });
    const compact = compactPlantsSearch(search);
    const restored = plantsSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)));
    expect(restored).toEqual(search);
    expect(compactPlantsSearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters and removes unsupported nested values", async () => {
    const router = setup(
      `/collection/plants${defaultStringifySearch({ lang: "zh", items: { categories: ["作物"], page: 4 } })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/collection/plants",
      from: "/collection/plants",
      search: (previous) => ({ ...previous, ...plantsSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { categories: ["作物"] },
    });
  });
});
