import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { Route as RecordRoute } from "../../routes/collections.records.$id";
import { catalogFixture, fixtureRequest } from "../collection-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "../plants/fixture";
import { recordLocation } from "./item-route";
import { parseRecordId } from "./record-detail";

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
    path: "/collections/records/$id",
    loader: RecordRoute.options.loader,
  });
  return createRouter({
    history: createMemoryHistory({ initialEntries: [href] }),
    routeTree: root.addChildren([detail]),
  });
}

afterEach(() => vi.unstubAllGlobals());

test.each([
  ["/collections/records/1", 1, "item"],
  ["/collections/records/20", 20, "seed"],
  ["/collections/records/100", 100, "series"],
  ["/collections/records/100?focus=1", 100, "series"],
  ["/collections/records/100?focus=999", 100, "series"],
  ["/collections/records/100?focus=invalid", 100, "series"],
])("路由 %s 始终加载路径对应的独立详情", async (href, id, kind) => {
  const router = setup(href);
  await router.load();
  expect(router.state.location.href).toBe(href);
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
    record: { id },
    model: { category: "plants", detail: { kind, record: { id } } },
  });
  expect(router.buildLocation(recordLocation({ id: 20 })).href).toBe("/collections/records/20");
});

test.each(["99", "999", "0", "01", "1e2", "-1", "9007199254740992"])(
  "引用、未知或非法记录 %s 返回未找到",
  async (id) => {
    const router = setup(`/collections/records/${id}`);
    await router.load();
    expect(router.state.matches.at(-1)?.status).toBe("notFound");
  },
);

test("记录编号只接受正安全整数", () => {
  expect(parseRecordId("1")).toBe(1);
  expect(parseRecordId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  for (const value of ["0", "-1", "01", "1.5", "1e2", "", "abc", "9007199254740992"])
    expect(parseRecordId(value)).toBeNull();
});
