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
  compactMiscellaneousSearch,
  compactMiscellaneousSearchMiddleware,
  miscellaneousSearchSchema,
} from "./search";

function setup(initialEntry = "/miscellaneous") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const miscellaneous = createRoute({
    getParentRoute: () => root,
    path: "/miscellaneous",
    validateSearch: miscellaneousSearchSchema,
    search: { middlewares: [compactMiscellaneousSearchMiddleware] },
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: root.addChildren([miscellaneous]),
  });
}

describe("compact miscellaneous URLs", () => {
  it("omits defaults and serializes meaningful search and filter state", () => {
    const router = setup();
    const empty = router.buildLocation({
      to: "/miscellaneous",
      from: "/miscellaneous",
      search: miscellaneousSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/miscellaneous");

    const selected = router.buildLocation({
      to: "/miscellaneous",
      from: "/miscellaneous",
      search: miscellaneousSearchSchema.parse({
        items: { q: "木 & + #", qualities: ["1"], sort: "quality-desc" },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "木 & + #", qualities: ["1"], sort: "quality-desc" },
    });
  });

  it("round trips encoded state and removes malformed filters", () => {
    const parsed = miscellaneousSearchSchema.parse({
      items: { q: '贝壳 + # ? "', qualities: ["1", "8", "__missing", "1"], sort: "bad" },
    });
    const compact = compactMiscellaneousSearch(parsed);
    const restored = miscellaneousSearchSchema.parse(
      defaultParseSearch(defaultStringifySearch(compact)),
    );
    expect(restored).toEqual({
      items: { q: '贝壳 + # ? "', sort: "original", qualities: ["1", "__missing"] },
    });
    expect(compactMiscellaneousSearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters while stripping unsupported fields", async () => {
    const router = setup(
      `/miscellaneous${defaultStringifySearch({
        lang: "zh",
        items: { qualities: ["2"], page: 4 },
      })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/miscellaneous",
      from: "/miscellaneous",
      search: (previous) => ({ ...previous, ...miscellaneousSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { qualities: ["2"] },
    });
  });
});

describe("layout URL overrides", () => {
  it.each(["grid", "table"] as const)(
    "preserves explicit %s layout through URLs and query updates",
    (layout) => {
      const router = setup();
      const search = miscellaneousSearchSchema.parse({ layout, items: { q: "测试" } });
      const compact = compactMiscellaneousSearch(search);
      expect(
        miscellaneousSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact))),
      ).toEqual(search);
      const location = router.buildLocation({ to: "/miscellaneous", search });
      expect(defaultParseSearch(location.searchStr)).toMatchObject({ layout });
      const cleared = router.buildLocation({
        to: "/miscellaneous",
        search: miscellaneousSearchSchema.parse({ ...search, items: {} }),
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    },
  );
  it("omits absent and malformed layouts so local preferences can apply", () => {
    for (const layout of [undefined, null, "bad", 42, []]) {
      const parsed = miscellaneousSearchSchema.parse({ layout });
      expect(parsed.layout).toBeUndefined();
      expect(compactMiscellaneousSearch(parsed).layout).toBeUndefined();
    }
  });
});
