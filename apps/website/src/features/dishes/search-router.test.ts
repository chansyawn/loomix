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
import { compactDishesSearch, compactDishesSearchMiddleware, dishesSearchSchema } from "./search";

function setup(initialEntry = "/collection/dishes") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const dishes = createRoute({
    getParentRoute: () => root,
    path: "/collection/dishes",
    validateSearch: dishesSearchSchema,
    search: { middlewares: [compactDishesSearchMiddleware] },
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: root.addChildren([dishes]),
  });
}

describe("compact dish URLs", () => {
  it("omits defaults and serializes only meaningful view fields", () => {
    const router = setup();
    const empty = router.buildLocation({
      to: "/collection/dishes",
      from: "/collection/dishes",
      search: dishesSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/collection/dishes");
    const selected = router.buildLocation({
      to: "/collection/dishes",
      from: "/collection/dishes",
      search: dishesSearchSchema.parse({
        items: { q: "鱼", galaxyFlavors: ["禾夏"], cookwares: ["烤架"] },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "鱼", galaxyFlavors: ["禾夏"], cookwares: ["烤架"] },
    });
  });

  it("round trips encoded text and compacts idempotently", () => {
    const search = dishesSearchSchema.parse({
      view: "series",
      items: { q: '鱼 & + # ? "', difficulties: ["简单"], series: ["__ungrouped"] },
      series: { q: "星露系列", qualities: ["__missing", "2"], sort: "name-asc" },
    });
    const compact = compactDishesSearch(search);
    const restored = dishesSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)));
    expect(restored).toEqual(search);
    expect(compactDishesSearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters and removes unsupported nested values", async () => {
    const router = setup(
      "/collection/dishes" +
        defaultStringifySearch({ lang: "zh", items: { cookwares: ["烤架"], page: 4 } }),
    );
    await router.load();
    const location = router.buildLocation({
      to: "/collection/dishes",
      from: "/collection/dishes",
      search: (previous) => ({ ...previous, ...dishesSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { cookwares: ["烤架"] },
    });
  });
});
