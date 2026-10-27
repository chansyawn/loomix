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
  compactMiscellanySearch,
  compactMiscellanySearchMiddleware,
  miscellanySearchSchema,
} from "./search";

function setup(initialEntry = "/collection/miscellany") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const miscellany = createRoute({
    getParentRoute: () => root,
    path: "/collection/miscellany",
    validateSearch: miscellanySearchSchema,
    search: { middlewares: [compactMiscellanySearchMiddleware] },
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
    routeTree: root.addChildren([miscellany]),
  });
}

describe("compact miscellany URLs", () => {
  it("omits defaults and serializes meaningful search and filter state", () => {
    const router = setup();
    const empty = router.buildLocation({
      to: "/collection/miscellany",
      from: "/collection/miscellany",
      search: miscellanySearchSchema.parse({}),
    });
    expect(empty.href).toBe("/collection/miscellany");

    const selected = router.buildLocation({
      to: "/collection/miscellany",
      from: "/collection/miscellany",
      search: miscellanySearchSchema.parse({
        items: { q: "木 & + #", qualities: ["1"], sort: "quality-desc" },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "木 & + #", qualities: ["1"], sort: "quality-desc" },
    });
  });

  it("round trips encoded state and removes malformed filters", () => {
    const parsed = miscellanySearchSchema.parse({
      items: { q: '贝壳 + # ? "', qualities: ["1", "8", "__missing", "1"], sort: "bad" },
    });
    const compact = compactMiscellanySearch(parsed);
    const restored = miscellanySearchSchema.parse(
      defaultParseSearch(defaultStringifySearch(compact)),
    );
    expect(restored).toEqual({
      items: { q: '贝壳 + # ? "', sort: "original", qualities: ["1", "__missing"] },
    });
    expect(compactMiscellanySearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters while stripping unsupported fields", async () => {
    const router = setup(
      `/collection/miscellany${defaultStringifySearch({
        lang: "zh",
        items: { qualities: ["2"], page: 4 },
      })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/collection/miscellany",
      from: "/collection/miscellany",
      search: (previous) => ({ ...previous, ...miscellanySearchSchema.parse(previous) }),
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
      const search = miscellanySearchSchema.parse({ layout, items: { q: "测试" } });
      const compact = compactMiscellanySearch(search);
      expect(
        miscellanySearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact))),
      ).toEqual(search);
      const location = router.buildLocation({ to: "/collection/miscellany", search });
      expect(defaultParseSearch(location.searchStr)).toMatchObject({ layout });
      const cleared = router.buildLocation({
        to: "/collection/miscellany",
        search: miscellanySearchSchema.parse({ ...search, items: {} }),
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    },
  );
  it("omits absent and malformed layouts so local preferences can apply", () => {
    for (const layout of [undefined, null, "bad", 42, []]) {
      const parsed = miscellanySearchSchema.parse({ layout });
      expect(parsed.layout).toBeUndefined();
      expect(compactMiscellanySearch(parsed).layout).toBeUndefined();
    }
  });
});
