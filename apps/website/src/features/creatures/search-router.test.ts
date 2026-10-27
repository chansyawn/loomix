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
  compactCreaturesSearch,
  compactCreaturesSearchMiddleware,
  creaturesSearchSchema,
} from "./search";

function setup(initialEntry = "/collection/creatures") {
  const root = createRootRoute({ validateSearch: z.object({ lang: z.string().optional() }) });
  const creatures = createRoute({
    getParentRoute: () => root,
    path: "/collection/creatures",
    validateSearch: creaturesSearchSchema,
    search: { middlewares: [compactCreaturesSearchMiddleware] },
  });
  const history = createMemoryHistory({ initialEntries: [initialEntry] });
  const router = createRouter({
    routeTree: root.addChildren([creatures]),
    history,
  });
  return { router };
}

describe("compact creatures URLs", () => {
  it("omits all defaults and only serializes meaningful nested fields", () => {
    const { router } = setup();
    const empty = router.buildLocation({
      to: "/collection/creatures",
      from: "/collection/creatures",
      search: creaturesSearchSchema.parse({}),
    });
    expect(empty.href).toBe("/collection/creatures");
    const selected = router.buildLocation({
      to: "/collection/creatures",
      from: "/collection/creatures",
      search: creaturesSearchSchema.parse({
        items: { q: "鱼", regions: ["禾夏"], sort: "quality-desc" },
      }),
    });
    expect(defaultParseSearch(selected.searchStr)).toEqual({
      items: { q: "鱼", sort: "quality-desc", regions: ["禾夏"] },
    });
  });

  it("round trips through URL encoding and compacts idempotently", () => {
    const search = creaturesSearchSchema.parse({
      view: "series",
      items: {
        q: '鱼 & + # ? "',
        categories: ["水生生物"],
        regions: ["禾夏"],
        series: ["__ungrouped"],
      },
      series: { q: "系列", qualities: ["__missing", "2"], sort: "name-asc" },
    });
    const compact = compactCreaturesSearch(search);
    const restored = creaturesSearchSchema.parse(
      defaultParseSearch(defaultStringifySearch(compact)),
    );
    expect(restored).toEqual(search);
    expect(compactCreaturesSearch(compact)).toEqual(compact);
  });

  it("preserves parent parameters while discarding unsupported query parameters", async () => {
    const { router } = setup(
      `/collection/creatures${defaultStringifySearch({ lang: "zh", items: { categories: ["水生生物"], page: 4 } })}`,
    );
    await router.load();
    const location = router.buildLocation({
      to: "/collection/creatures",
      from: "/collection/creatures",
      search: (previous) => ({ ...previous, ...creaturesSearchSchema.parse(previous) }),
    });
    expect(defaultParseSearch(location.searchStr)).toEqual({
      lang: "zh",
      items: { categories: ["水生生物"] },
    });
  });
});

describe("layout URL overrides", () => {
  it.each(["grid", "table"] as const)(
    "preserves explicit %s layout through URLs and query updates",
    (layout) => {
      const { router } = setup();
      const search = creaturesSearchSchema.parse({ layout, items: { q: "测试" } });
      const compact = compactCreaturesSearch(search);
      expect(
        creaturesSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact))),
      ).toEqual(search);
      const location = router.buildLocation({ to: "/collection/creatures", search });
      expect(defaultParseSearch(location.searchStr)).toMatchObject({ layout });
      const cleared = router.buildLocation({
        to: "/collection/creatures",
        search: creaturesSearchSchema.parse({ ...search, items: {} }),
      });
      expect(defaultParseSearch(cleared.searchStr)).toEqual({ layout });
    },
  );
  it("omits absent and malformed layouts so local preferences can apply", () => {
    for (const layout of [undefined, null, "bad", 42, []]) {
      const parsed = creaturesSearchSchema.parse({ layout });
      expect(parsed.layout).toBeUndefined();
      expect(compactCreaturesSearch(parsed).layout).toBeUndefined();
    }
  });
});
