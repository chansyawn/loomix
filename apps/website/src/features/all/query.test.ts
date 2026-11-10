import { collectionFilterChips } from "../collection/filter-chips";
import { expect, test } from "vite-plus/test";
import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { catalogFixture, assetsFixture, addFixtureRecords } from "../collection-fixture";
import { createCollectionCatalog } from "../collection/catalog";
import { queryAll, filterGroups, normalizeAllQuery } from "./query";
import { allSearchSchema, compactAllSearch, emptyQuery } from "./search";
function data() {
  const catalog = catalogFixture();
  catalog.gameplayTags.push(
    { id: 10, name: "植物", enumName: "Plant", parentId: null, displayName: "植物" },
    { id: 11, name: "红色花朵", enumName: "RedFlower", parentId: 10, displayName: "红色花朵" },
  );
  addFixtureRecords(
    catalog,
    {
      id: 1,
      name: "花材",
      description: "白名单花材",
      quality: 2,
      image: null,
      type: "material",
      subcategory: null,
      trade: null,
      acquisition: [{ sourceId: 5, label: "采集", condition: null }],
      gameplayTagGroups: ([6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const).map((field) => ({
        field,
        tagIds: field === 9 ? [11] : [],
      })),
    },
    {
      id: 2,
      name: "第二件",
      quality: null,
      image: null,
      description: null,
      type: "material",
      subcategory: null,
      trade: null,
      acquisition: null,
    },
  );
  catalog.references.push({ id: 99, name: "隐藏材料" });
  return createCollectionCatalog(catalog, assetsFixture(catalog));
}
test("搜索只查询正式记录，并覆盖编号、介绍和原始标签枚举", () => {
  const source = data();
  for (const q of ["1", "白名单", "RedFlower"]) {
    expect(queryAll(source, { ...emptyQuery(), q }).rows.map((row) => row.id)).toEqual([1]);
  }
  expect(queryAll(source, { ...emptyQuery(), q: "隐藏材料" }).total).toBe(0);
});
test("公共属性不限制类别，父标签匹配后代，多标签OR跨组AND", () => {
  const source = data();
  expect(
    queryAll(source, {
      ...emptyQuery(),
      colors: ["红色花朵"],
      gameplayTags: ["10", "999"],
      qualities: ["2"],
    }).rows.map((row) => row.id),
  ).toEqual([1]);
  expect(queryAll(source, { ...emptyQuery(), colors: ["蓝色"], gameplayTags: ["10"] }).total).toBe(
    0,
  );
  expect(
    filterGroups(source).find((group) => group.key === "gameplayTags")?.options[0].children?.[0]
      .value,
  ).toBe("11");
});
test("未知品阶在升降序都排后，查询URL可往返并压缩默认值", () => {
  const source = data();
  for (const sort of ["quality-asc", "quality-desc"] as const)
    expect(queryAll(source, { ...emptyQuery(), sort }).rows.map((row) => row.id)).toEqual([1, 2]);
  const search = allSearchSchema.parse({
      layout: "table",
      items: { q: "花 & #", gameplayTags: ["10", "10"], colors: ["红色花朵"] },
    }),
    compact = compactAllSearch(search);
  expect(allSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
    search,
  );
  expect(compactAllSearch({})).toEqual({});
});

test("父标签URL规范化后，筛选摘要与子树勾选一致", () => {
  const source = data(),
    query = normalizeAllQuery(source, { ...emptyQuery(), gameplayTags: ["10"] }),
    groups = filterGroups(source);
  expect(query.gameplayTags).toEqual(["10", "11"]);
  const removed: { key: string; values: string[] }[] = [];
  const chips = collectionFilterChips(
    groups,
    query,
    (key, values) => removed.push({ key, values }),
    { value: "", clear: () => {} },
  );
  expect(chips.map((chip) => chip.label)).toEqual(["GameplayTag：植物"]);
  chips[0]!.remove();
  expect(removed).toEqual([{ key: "gameplayTags", values: [] }]);
});
