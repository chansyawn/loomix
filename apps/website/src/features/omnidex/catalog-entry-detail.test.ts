import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { emptyHairDyeing } from "@loomix/schema/hair-dyeing";
import { routeTree } from "../../routeTree.gen";
import { Route as CatalogEntryRoute } from "../../routes/catalog_.$id";
import { addFixtureRecords, catalogFixture, fixtureRequest } from "../omnidex-fixture";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "../plants/fixture";
import { catalogEntryLocation, catalogEntryRouteId } from "./entry-location";
import { parseCatalogEntryId } from "./catalog-entry-detail";

function setup(
  href: string,
  intercept: (request: typeof fetch) => typeof fetch = (request) => request,
) {
  const appearance = {
    name: "发型",
    image: null,
    quality: null,
    description: null,
    category: "发型",
  };
  const resources = catalogFixture({
    clothing: {
      items: [],
      outfits: [],
      neighborOutfit: [],
      appearances: [
        { ...appearance, id: 40 },
        { ...appearance, id: 41, category: "面部" },
        { ...appearance, id: 42 },
      ],
    },
    plants: plantsDataFixture({
      items: [
        plantItemFixture({ id: 1, category: "作物" }),
        ...[2, 3, 4].map((id) => plantItemFixture({ id, category: "花" })),
      ],
      seeds: [plantSeedFixture({ id: 20, plantIds: [1] })],
      series: [
        plantSeriesFixture({ id: 100, plantIds: [1] }),
        plantSeriesFixture({
          id: 110,
          plantIds: [2, 3, 4, 1],
          flowerHybridization: [
            { parentItemIds: [2, 2], productItemId: 3 },
            { parentItemIds: [1, 2], productItemId: 3 },
          ],
        }),
      ],
    }),
  });
  const { catalog, gameplayTags } = resources;
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "clothing", id: 50, name: "眠月睡袍" },
    { kind: "neighborOutfit", id: 51, name: "眠月睡袍", playerItemId: 50 },
    { kind: "reference", id: 99, name: "发型" },
    { kind: "reference", id: 200002, name: "碎钱" },
    { kind: "reference", id: 200003, name: "足迹" },
    { kind: "reference", id: 200014, name: "友邻服饰币" },
  );
  catalog.shops.push(
    { id: "luomiTv", name: "络米电视购" },
    {
      id: "neighborWardrobe",
      name: "友邻衣橱",
      paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
    },
  );
  catalog.purchaseOffers.push(
    {
      id: "luomiTv:1",
      shopId: "luomiTv",
      deliveredItemId: 50,
      currencyItemId: 200003,
      price: { kind: "fixed", amount: 1500 },
      note: "任务/限时货架",
    },
    {
      id: "luomiTv:3",
      shopId: "luomiTv",
      deliveredItemId: 50,
      currencyItemId: 200003,
      price: { kind: "fixed", amount: 1800 },
    },
    {
      id: "neighborWardrobe:1",
      shopId: "neighborWardrobe",
      deliveredItemId: 51,
      currencyItemId: 200014,
      price: { kind: "fixed", amount: 600 },
    },
    {
      id: "luomiTv:2",
      shopId: "luomiTv",
      deliveredItemId: 99,
      currencyItemId: 200003,
      price: { kind: "fixed", amount: 100 },
    },
  );
  const request = vi.fn(
    intercept(
      fixtureRequest({
        ...resources,
        hairDyeing: {
          ...emptyHairDyeing(),
          hairstyleConfigs: [
            {
              itemId: 40,
              regions: [
                { id: 9, name: "整体发色", colorGroupIds: [50], defaultColorBlockId: null },
              ],
            },
          ],
          colorGroups: [
            {
              id: 50,
              name: "颜色",
              displayColor: [0, 0, 0, 255],
              icon: null,
              colorBlockIds: [10],
              unlock: {
                mode: "full",
                sort: 0,
                flowerMatchEnabled: false,
                unlockCost: null,
                dyeCost: null,
              },
            },
          ],
          colorBlocks: [{ id: 10, displayColor: [0, 0, 0, 255], icon: null, visualKind: "tint" }],
        },
      }),
    ),
  );
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

function detailLoaderData(router: ReturnType<typeof setup>) {
  type LoaderData = typeof CatalogEntryRoute.types.loaderData;
  return router.state.matches.at(-1)?.loaderData as LoaderData | undefined;
}

test.each([
  [
    50,
    {
      name: "络米电视购",
      prices: [
        { priceLabel: "1500 足迹", note: "任务/限时货架" },
        { priceLabel: "1800 足迹", note: null },
      ],
    },
  ],
  [
    51,
    {
      name: "友邻衣橱",
      paymentNote: "使用友邻服饰币时，余额不足可用等额碎钱补足。",
      prices: [{ priceLabel: "600 友邻服饰币", note: null }],
    },
  ],
] as const)("同名服饰详情 %i 只展示直接交付给该款的商店报价", async (id, shop) => {
  const router = setup(`/catalog/${id}#purchase-offers`);
  await router.load();
  expect(router.state.matches.at(-1)?.status).toBe("success");
  expect(detailLoaderData(router)?.quotes).toMatchObject([shop]);
});

test.each([40, 100])("外观和集合 %i 的详情不继承其他物品的报价", async (id) => {
  const router = setup(`/catalog/${id}`);
  await router.load();
  expect(router.state.matches.at(-1)?.status).toBe("success");
  expect(detailLoaderData(router)?.quotes).toBeUndefined();
});

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

test.each([2, 4, 110])("花卉详情 %s 带上本系列已收录的花朵和配方", async (id) => {
  const router = setup(`/catalog/${id}#flower-hybridization`);
  await router.load();
  expect(router.state.matches.at(-1)?.loaderData).toMatchObject({
    model: {
      category: "plants",
      detail: {
        hybridization: [
          {
            id: 110,
            members: [{ id: 2 }, { id: 3 }, { id: 4 }],
            recipes: [{ parentItemIds: [2, 2], productItemId: 3 }],
          },
        ],
      },
    },
  });
});

test.each([1, 20, 100])("非花朵或无配方详情 %s 不提供谱系", async (id) => {
  const router = setup(`/catalog/${id}`);
  await router.load();
  const detail = detailLoaderData(router)?.model.detail;
  expect(detail).toBeDefined();
  expect(detail && "hybridization" in detail ? detail.hybridization : []).toEqual([]);
});

test("发型详情独立完成加载，延迟且失败的染色请求可重试", async () => {
  let releaseResponse!: (response: Response) => void;
  const response = new Promise<Response>((resolve) => {
    releaseResponse = resolve;
  });
  let notifyRequested!: () => void;
  const requested = new Promise<void>((resolve) => {
    notifyRequested = resolve;
  });
  let requests = 0;
  const router = setup("/catalog/40#hair-dyeing", (request) => (input, init) => {
    if (typeof input === "string" && input.endsWith("/hair-dyeing.json") && ++requests === 1) {
      notifyRequested();
      return response;
    }
    return request(input, init);
  });
  await router.load();
  const match = router.state.matches.at(-1);
  expect(match?.status).toBe("success");
  expect(requests).toBe(0);
  const read = detailLoaderData(router)?.readHairDyeing;
  if (!read) throw new Error("发型详情缺少染色加载函数");
  const pending = read();
  await requested;
  expect(router.state.matches.at(-1)?.status).toBe("success");
  releaseResponse(new Response(null, { status: 503 }));
  await expect(pending).rejects.toThrow("503");
  await expect(read()).resolves.toMatchObject([{ name: "整体发色", groups: [{ id: 50 }] }]);
  expect(requests).toBe(2);
});

test("非发型外观省略染色加载，无配置的发型返回空调色盘", async () => {
  const face = setup("/catalog/41");
  await face.load();
  expect(detailLoaderData(face)?.readHairDyeing).toBeUndefined();
  const hair = setup("/catalog/42");
  await hair.load();
  await expect(detailLoaderData(hair)?.readHairDyeing?.()).resolves.toEqual([]);
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
