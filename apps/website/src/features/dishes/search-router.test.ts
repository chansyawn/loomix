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
        items: {
          q: "鱼",
          galaxyFlavors: ["禾夏"],
          cookwares: ["烤架"],
          tastes: ["甜"],
          difficultyRequirements: ["厨师等级 ≥ 5"],
          ingredientCategories: ["50015"],
        },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: {
        q: "鱼",
        galaxyFlavors: ["禾夏"],
        cookwares: ["烤架"],
        tastes: ["甜"],
        difficultyRequirements: ["厨师等级 ≥ 5"],
        ingredientCategories: ["50015"],
      },
    });
  });

  it("round trips encoded text and compacts idempotently", () => {
    const search = dishesSearchSchema.parse({
      view: "series",
      items: {
        q: '鱼 & + # ? "',
        difficulties: ["简单"],
        tastes: ["甜"],
        difficultyRequirements: ["无额外条件"],
        series: ["__ungrouped"],
      },
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

describe("layout URL overrides", () => {
  it.each(["grid", "table"] as const)(
    "preserves explicit %s layout through URLs and query updates",
    (layout) => {
      const router = setup();
      const search = dishesSearchSchema.parse({ layout, items: { q: "测试" } });
      const compact = compactDishesSearch(search);
      expect(dishesSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
        search,
      );
      const location = router.buildLocation({ to: "/collection/dishes", search });
      expect(defaultParseSearch(location.searchStr)).toMatchObject({ layout });
      const cleared = router.buildLocation({
        to: "/collection/dishes",
        search: dishesSearchSchema.parse({ ...search, items: {} }),
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    },
  );
  it("omits absent and malformed layouts so local preferences can apply", () => {
    for (const layout of [undefined, null, "bad", 42, []]) {
      const parsed = dishesSearchSchema.parse({ layout });
      expect(parsed.layout).toBeUndefined();
      expect(compactDishesSearch(parsed).layout).toBeUndefined();
    }
  });
});
