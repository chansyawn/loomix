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
  compactFurnitureSearch,
  compactFurnitureSearchMiddleware,
  furnitureSearchSchema,
} from "./search";

function setup(initialEntry = "/collection/furniture") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const furniture = createRoute({
    getParentRoute: () => root,
    path: "/collection/furniture",
    validateSearch: furnitureSearchSchema,
    search: { middlewares: [compactFurnitureSearchMiddleware] },
  });
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const router = createRouter({
    routeTree: root.addChildren([furniture]),
    history,
  });
  return { router };
}

describe("compact furniture URLs", () => {
  it("omits all defaults and only serializes meaningful nested fields", () => {
    const { router } = setup();
    const empty = router.buildLocation({
      to: "/collection/furniture",
      from: "/collection/furniture",
      search: furnitureSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/collection/furniture");
    const selected = router.buildLocation({
      to: "/collection/furniture",
      from: "/collection/furniture",
      search: furnitureSearchSchema.parse({
        items: { q: "桌", colors: ["白色"], sort: "quality-desc" },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "桌", sort: "quality-desc", colors: ["白色"] },
    });
  });

  it("round trips through URL encoding and compacts idempotently", () => {
    const search = furnitureSearchSchema.parse({
      view: "sets",
      items: { q: '桌 & + # ? "', categories: ["起居"], colors: ["白色"], sets: ["__ungrouped"] },
      sets: { q: "套装", qualities: ["__missing", "2"], sort: "name-asc" },
    });
    const compact = compactFurnitureSearch(search);
    const restored = furnitureSearchSchema.parse(
      defaultParseSearch(defaultStringifySearch(compact)),
    );
    expect(restored).toEqual(search);
    expect(compactFurnitureSearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters while normalizing old furniture URLs", async () => {
    const { router } = setup(
      `/collection/furniture${defaultStringifySearch({ lang: "zh", items: { category: "起居", page: 4 } })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/collection/furniture",
      from: "/collection/furniture",
      search: (previous) => ({ ...previous, ...furnitureSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { categories: ["起居"] },
    });
  });
});
