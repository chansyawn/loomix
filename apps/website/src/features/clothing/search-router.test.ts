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
import {
  compactClothingSearch,
  compactClothingSearchMiddleware,
  clothingSearchSchema,
} from "./search";

function setup(initialEntry = "/collection/clothing") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const clothing = createRoute({
    getParentRoute: () => root,
    path: "/collection/clothing",
    validateSearch: clothingSearchSchema,
    search: { middlewares: [compactClothingSearchMiddleware] },
  });
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const router = createRouter({
    routeTree: root.addChildren([clothing]),
    history,
  });
  return { router };
}

describe("compact clothing URLs", () => {
  it("omits all defaults and only serializes meaningful nested fields", () => {
    const { router } = setup();
    const empty = router.buildLocation({
      to: "/collection/clothing",
      from: "/collection/clothing",
      search: clothingSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/collection/clothing");
    const selected = router.buildLocation({
      to: "/collection/clothing",
      from: "/collection/clothing",
      search: clothingSearchSchema.parse({
        items: { q: "桌", colors: ["白色"], sort: "quality-desc" },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "桌", sort: "quality-desc", colors: ["白色"] },
    });
  });

  it("round trips through URL encoding and compacts idempotently", () => {
    const search = clothingSearchSchema.parse({
      view: "sets",
      items: { q: '桌 & + # ? "', categories: ["上装"], colors: ["白色"], sets: ["__ungrouped"] },
      appearances: { q: "卷发", categories: ["发型"], sort: "name-desc" },
      sets: { q: "套装", qualities: ["__missing", "2"], sort: "name-asc" },
    });
    const compact = compactClothingSearch(search);
    const restored = clothingSearchSchema.parse(
      defaultParseSearch(defaultStringifySearch(compact)),
    );
    expect(restored).toEqual(search);
    expect(compactClothingSearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters while stripping unsupported clothing fields", async () => {
    const { router } = setup(
      `/collection/clothing${defaultStringifySearch({ lang: "zh", items: { categories: ["上装"], page: 4 } })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/collection/clothing",
      from: "/collection/clothing",
      search: (previous) => ({ ...previous, ...clothingSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { categories: ["上装"] },
    });
  });
});
