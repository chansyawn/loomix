import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { routeTree } from "../../routeTree.gen";
import { Route as CatalogEntryRoute } from "../../routes/catalog_.$id";
import { catalogFixture, fixtureRequest } from "../omnidex-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "../plants/fixture";
import { catalogEntryLocation, catalogEntryRouteId } from "./entry-location";
import { parseCatalogEntryId } from "./catalog-entry-detail";

function setup(href: string) {
  const resources = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 1, category: "作物" })],
      seeds: [plantSeedFixture({ id: 20, plantIds: [1] })],
      series: [plantSeriesFixture({ id: 100, plantIds: [1] })],
    }),
  });
  resources.catalog.items.push({ kind: "reference", id: 99, name: "仅供引用", description: null });
  const request = vi.fn(fixtureRequest(resources));
  vi.stubGlobal("fetch", request);
  const root = createRootRoute();
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/catalog/$id",
    loader: CatalogEntryRoute.options.loader,
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries: [href] }),
    routeTree: root.addChildren([detail]),
  });
}

afterEach(() => vi.unstubAllGlobals());

test.each([
  ["/catalog/1", 1, "item"],
  ["/catalog/20", 20, "seed"],
  ["/catalog/100", 100, "series"],
  ["/catalog/100?focus=1", 100, "series"],
  ["/catalog/100?focus=999", 100, "series"],
  ["/catalog/100?focus=invalid", 100, "series"],
])("路由 %s 始终加载路径对应的独立详情", async (href, id, kind) => {
  const router = setup(href);
  await router.load();
  expect(router.state.location.href).toBe(href);
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
    record: { id },
    model: { category: "plants", detail: { kind, record: { id } } },
  });
  expect(router.buildLocation(catalogEntryLocation({ id: 20 })).href).toBe("/catalog/20");
});

test.each(["99", "999", "0", "01", "1e2", "-1", "9007199254740992"])(
  "引用、未知或非法记录 %s 返回未找到",
  async (id) => {
    const router = setup(`/catalog/${id}`);
    await router.load();
    expect(router.state.matches.at(-1)?.status).toBe("notFound");
  },
);

test("图鉴列表直接挂在根路径，旧路径不再匹配", () => {
  const router = createRouter({ history: createMemoryHistory(), routeTree });
  for (const path of [
    "/catalog",
    "/furniture",
    "/plants",
    "/creatures",
    "/miscellaneous",
    "/clothing",
    "/dishes",
  ]) {
    const matches = router.matchRoutes(path, {});
    expect(matches.at(-1)?.routeId).toBe(path);
  }
  expect(router.matchRoutes("/catalog/1", {}).at(-1)?.routeId).toBe(catalogEntryRouteId);
  for (const path of ["/collections/all", "/collections/plants", "/collections/records/1"]) {
    expect(router.matchRoutes(path, {}).map((match) => match.routeId)).toEqual([routeTree.id]);
  }
});

test("记录编号只接受正安全整数", () => {
  expect(parseCatalogEntryId("1")).toBe(1);
  expect(parseCatalogEntryId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  for (const value of ["0", "-1", "01", "1.5", "1e2", "", "abc", "9007199254740992"])
    expect(parseCatalogEntryId(value)).toBeNull();
});
