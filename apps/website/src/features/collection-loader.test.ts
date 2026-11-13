import { afterEach, expect, test, vi } from "vite-plus/test";
import { addFixtureRecords, catalogFixture, fixtureRequest } from "./collection-fixture";
import { neighborFixture } from "./neighbors/fixture";
import { loadAllCollectionCatalog, loadCollectionView } from "./collection-loader";
import { flattenFilterOptions } from "./collection/filter-types";
import { queryAll } from "./all/query";
import { allSearchForTag } from "./all/search";

afterEach(() => vi.unstubAllGlobals());
test("loads manifest-selected documents and keeps confirmed empty collections empty", async () => {
  vi.stubGlobal("fetch", vi.fn(fixtureRequest(catalogFixture())));
  const view = await loadCollectionView();
  expect(view.plants.items).toEqual([]);
  expect(view.miscellaneous).toEqual([]);
});
test("rejects failed resource requests", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
  await expect(loadCollectionView()).rejects.toThrow("Unable to load release");
});

test("全部页从同一发布加载友邻偏好，跳转标签可匹配或提示暂无收录物品", async () => {
  const { catalog, gameplayTags, database } = neighborFixture();
  addFixtureRecords(catalog, gameplayTags, {
    id: 10,
    name: "水果",
    type: "material",
    tagIds: [1],
    image: null,
    description: null,
    quality: null,
    subcategory: null,
    trade: null,
    acquisition: null,
  });
  const request = fixtureRequest({ catalog, gameplayTags, neighbors: database });
  const data = await loadAllCollectionCatalog(request);
  const options = flattenFilterOptions(data.tags.options());
  expect(options.find((option) => option.value === "1")).toMatchObject({
    label: "树生水果",
    count: 1,
  });
  expect(options.find((option) => option.value === "2")).toMatchObject({
    label: "含水果（暂无收录物品）",
    count: 0,
  });
  expect(queryAll(data, allSearchForTag(1).items).rows.map((row) => row.id)).toEqual([10]);
  expect(queryAll(data, allSearchForTag(2).items).rows).toEqual([]);
});

test("友邻偏好不能混入其他发布快照", async () => {
  const { catalog, gameplayTags, database } = neighborFixture();
  const request = fixtureRequest({
    catalog,
    gameplayTags,
    neighbors: { ...database, snapshotId: "b".repeat(64) },
  });
  await expect(loadAllCollectionCatalog(request)).rejects.toThrow("Resource context mismatch");
});
