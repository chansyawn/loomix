import { expect, test } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  defaultStringifySearch,
} from "@tanstack/react-router";
import {
  catalogSearchForTag,
  catalogSearchSchema,
  compactCatalogSearch,
  compactCatalogSearchMiddleware,
  emptyQuery,
} from "./search";

test("标签只接受正安全整数的十进制字符串并去重，非法模式回退 AND", () => {
  const search = catalogSearchSchema.parse({
    items: {
      tags: ["11", "0", "-1", "1.2", "1e2", "01", "", "9007199254740992", "11", "12"],
      tagMode: "invalid",
    },
  });
  expect(search.items.tags).toEqual(["11", "12"]);
  expect(search.items.tagMode).toBe("and");
  for (const tags of [null, 11, "11", [11]])
    expect(catalogSearchSchema.parse({ items: { tags } }).items.tags).toEqual([]);
});

test("URL 往返保留标签和模式，默认值压缩，清空后恢复 AND", () => {
  for (const tagMode of ["and", "or"] as const) {
    const state = catalogSearchSchema.parse({
      layout: "table",
      items: { tags: ["11", "12"], tagMode, q: "花 & #" },
    });
    const compact = compactCatalogSearch(state);
    expect(catalogSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
      state,
    );
    expect(compactCatalogSearch(compact)).toEqual(compact);
    expect(compact.items?.tagMode).toBe(tagMode === "or" ? "or" : undefined);
    expect(compactCatalogSearch({ ...state, items: emptyQuery() })).toEqual({ layout: "table" });
  }
  expect(compactCatalogSearch({})).toEqual({});
});

test("从友邻进入全部页只携带单标签，不继承已有查询", async () => {
  const root = createRootRoute();
  const all = createRoute({
    getParentRoute: () => root,
    path: "/catalog",
    validateSearch: catalogSearchSchema,
    search: { middlewares: [compactCatalogSearchMiddleware] },
  });
  const neighbor = createRoute({ getParentRoute: () => root, path: "/neighbors/$id" });
  const router = createRouter({
    routeTree: root.addChildren([all, neighbor]),
    history: createMemoryHistory({
      initialEntries: [
        `/neighbors/1${defaultStringifySearch({ items: { q: "旧搜索", tagMode: "or", tags: ["12"] }, layout: "table" })}`,
      ],
    }),
  });
  await router.load();
  const location = router.buildLocation({ to: "/catalog", search: catalogSearchForTag(11) });
  expect(defaultParseSearch(location.searchStr)).toEqual({ items: { tags: ["11"] } });
  expect(catalogSearchSchema.parse(defaultParseSearch(location.searchStr))).toEqual({
    layout: undefined,
    items: { ...emptyQuery(), tags: ["11"] },
  });
});
