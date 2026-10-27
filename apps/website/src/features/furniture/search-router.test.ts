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
      layout: "table",
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

  it("serializes both explicit layouts so links override local preferences", () => {
    const { router } = setup();
    const grid = router.buildLocation({
      to: "/collection/furniture",
      search: furnitureSearchSchema.parse({ layout: "grid" }),
    });
    expect(grid.href).toBe("/collection/furniture?layout=grid");
    const table = router.buildLocation({
      to: "/collection/furniture",
      search: furnitureSearchSchema.parse({ layout: "table" }),
    });
    expect(table.href).toBe("/collection/furniture?layout=table");
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

describe("layout URL overrides", () => {
  it.each(["grid", "table"] as const)(
    "preserves explicit %s layout through URLs and query updates",
    (layout) => {
      const { router } = setup();
      const search = furnitureSearchSchema.parse({ layout, items: { q: "测试" } });
      const compact = compactFurnitureSearch(search);
      expect(
        furnitureSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact))),
      ).toEqual(search);
      const location = router.buildLocation({ to: "/collection/furniture", search });
      expect(defaultParseSearch(location.searchStr)).toMatchObject({ layout });
      const cleared = router.buildLocation({
        to: "/collection/furniture",
        search: furnitureSearchSchema.parse({ ...search, items: {} }),
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    },
  );
  it("omits absent and malformed layouts so local preferences can apply", () => {
    for (const layout of [undefined, null, "bad", 42, []]) {
      const parsed = furnitureSearchSchema.parse({ layout });
      expect(parsed.layout).toBeUndefined();
      expect(compactFurnitureSearch(parsed).layout).toBeUndefined();
    }
  });
});
