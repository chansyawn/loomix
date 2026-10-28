import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import {
  dishesSearchSchema,
  compactDishesSearch,
  compactDishesSearchMiddleware,
  updateViewQuery,
} from "../dishes/search";
import { dishesOrigin } from "../dishes/detail-navigation";
import { emptyIngredientsQuery, ingredientsQuerySchema } from "./search";

function setup() {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collection/dishes",
    validateSearch: dishesSearchSchema,
    search: { middlewares: [compactDishesSearchMiddleware] },
  });
  const category = createRoute({
    getParentRoute: () => root,
    path: "/collection/dishes/ingredients/$id",
  });
  const item = createRoute({ getParentRoute: () => root, path: "/collection/plants/items/$id" });
  return createRouter({
    history: createMemoryHistory({
      initialEntries: [
        "/collection/dishes?view=ingredients&ingredients=%7B%22q%22%3A%22番茄%22%7D",
      ],
    }),
    routeTree: root.addChildren([list, category, item]),
  });
}

describe("ingredient URL state", () => {
  it("normalizes malformed values and deduplicates positive safe category IDs", () => {
    expect(
      ingredientsQuerySchema.parse({
        q: 7,
        sort: "bad",
        types: ["10", "10", 11, "01", "-1", "1e2", "9007199254740992"],
        colors: null,
        qualities: ["31"],
      }),
    ).toEqual({ ...emptyIngredientsQuery(), types: ["10"], qualities: ["31"] });
    for (const value of [null, [], "bad", 42])
      expect(dishesSearchSchema.parse({ ingredients: value }).ingredients).toEqual(
        emptyIngredientsQuery(),
      );
  });

  it("preserves independent tab queries and compacts encoded ingredient filters idempotently", () => {
    const search = dishesSearchSchema.parse({
      view: "ingredients",
      layout: "table",
      items: { q: "汤" },
      series: { q: "饮品" },
      ingredients: {
        q: '番茄 & + # ? "',
        types: ["11"],
        colors: ["21"],
        qualities: ["31"],
        sort: "recipes-desc",
      },
    });
    const compact = compactDishesSearch(search);
    expect(dishesSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
      search,
    );
    expect(compactDishesSearch(compact)).toEqual(compact);
    expect(updateViewQuery(search, { q: "不会写入食材查询" })).toEqual(search);
    expect(compactDishesSearch({ view: "ingredients" })).toEqual({ view: "ingredients" });
    expect(compactDishesSearch({})).toEqual({});
  });

  it("keeps ingredient search origin across category and canonical item details and returns to the original history entry", async () => {
    const router = setup();
    await router.load();
    const initial = router.state.location;
    const origin = dishesOrigin(initial);
    await router.navigate({
      to: "/collection/dishes/ingredients/$id",
      params: { id: "11" },
      state: { dishesOrigin: origin },
    });
    await router.navigate({
      to: "/collection/plants/items/$id",
      params: { id: "1" },
      state: { dishesOrigin: dishesOrigin(router.state.location) },
    });
    const retained = dishesOrigin(router.state.location)!;
    expect(retained).toEqual(origin);
    expect(
      dishesSearchSchema.parse(defaultParseSearch(retained.href.split("?")[1])).ingredients.q,
    ).toBe("番茄");
    router.history.go(retained.index - router.state.location.state.__TSR_index);
    await router.load();
    expect(router.state.location.href).toBe(initial.href);
    expect(router.state.location.state.__TSR_key).toBe(initial.state.__TSR_key);
  });
});
