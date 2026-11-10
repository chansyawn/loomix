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
import { collectionOrigin } from "@/features/collection/navigation";
import { emptyIngredientsQuery, ingredientFiltersForTag, ingredientsQuerySchema } from "./search";

function setup() {
  const root = createRootRoute();
  const list = createRoute({
    getParentRoute: () => root,
    path: "/collections/dishes",
    validateSearch: dishesSearchSchema,
    search: { middlewares: [compactDishesSearchMiddleware] },
  });
  const item = createRoute({ getParentRoute: () => root, path: "/collections/records/$id" });
  return createRouter({
    history: createMemoryHistory({
      initialEntries: [
        "/collections/dishes?view=ingredients&ingredients=%7B%22q%22%3A%22番茄%22%7D",
      ],
    }),
    routeTree: root.addChildren([list, item]),
  });
}

describe("ingredient URL state", () => {
  it("normalizes malformed values and deduplicates positive safe category IDs", () => {
    expect(
      ingredientsQuerySchema.parse({
        q: 7,
        sort: "bad",
        ingredientTags: ["10", "10", 11, "01", "-1", "1e2", "9007199254740992", "31"],
      }),
    ).toEqual({ ...emptyIngredientsQuery(), ingredientTags: ["10", "31"] });
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
        ingredientTags: ["11", "21", "31"],
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

  it("builds an ingredient filter from exactly one tag", () => {
    expect(ingredientFiltersForTag(11)).toEqual({
      ...emptyIngredientsQuery(),
      ingredientTags: ["11"],
    });
  });

  it("keeps ingredient search origin across canonical item details and returns to the original history entry", async () => {
    const router = setup();
    await router.load();
    const initial = router.state.location;
    const origin = collectionOrigin(initial);
    await router.navigate({
      to: "/collections/records/$id",
      params: { id: "1" },
      state: { collectionOrigin: origin },
    });
    const retained = collectionOrigin(router.state.location)!;
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
