import { collectionFilterChips } from "../collection/filter-chips";
import { expect, test } from "vite-plus/test";
import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { catalogFixture, assetsFixture, addFixtureRecords } from "../collection-fixture";
import { createCollectionCatalog } from "../collection/catalog";
import { queryAll, filterGroups } from "./query";
import { allSearchSchema, compactAllSearch, emptyQuery } from "./search";
function data() {
  const catalog = catalogFixture();
  catalog.gameplayTags.push(
    { id: 10, name: "植物", enumName: "Plant", parentId: null, displayName: "植物" },
    { id: 11, name: "颜色_花红", enumName: "RedFlower", parentId: 10, displayName: "红色花朵" },
    { id: 12, name: "材质_木", enumName: "Wood", parentId: null, displayName: "木质" },
    { id: 13, name: "风格_自然", enumName: "Natural", parentId: null, displayName: "自然" },
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
        tagIds: field === 9 ? [11] : field === 11 ? [12] : field === 12 ? [13] : [],
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
test("搜索只查询正式记录的编号、名称和介绍", () => {
  const source = data();
  for (const q of ["1", "花材", "白名单"]) {
    expect(queryAll(source, { ...emptyQuery(), q }).rows.map((row) => row.id)).toEqual([1]);
  }
  expect(queryAll(source, { ...emptyQuery(), q: "隐藏材料" }).total).toBe(0);
});
test("原始标签名称、枚举及显示名不参与文本搜索", () => {
  const source = data();
  for (const q of ["植物", "颜色_花红", "redflower", "红色花朵", "Wood", "自然"]) {
    expect(queryAll(source, { ...emptyQuery(), q }).total).toBe(0);
  }
});
test("标签派生的公共属性仍可跨类别筛选，同组OR跨组AND", () => {
  const source = data();
  expect(
    queryAll(source, {
      ...emptyQuery(),
      colors: ["蓝色", "红色花朵"],
      materials: ["木质"],
      styles: ["自然"],
      qualities: ["2"],
    }).rows.map((row) => row.id),
  ).toEqual([1]);
  expect(
    queryAll(source, { ...emptyQuery(), colors: ["红色花朵"], materials: ["金属"] }).total,
  ).toBe(0);
  for (const [key, value] of [
    ["colors", "红色花朵"],
    ["materials", "木质"],
    ["styles", "自然"],
  ] as const) {
    expect(filterGroups(source).find((group) => group.key === key)?.options).toContainEqual({
      value,
      label: value,
    });
  }
});
test("未知品阶在升降序都排后，查询URL可往返并压缩默认值", () => {
  const source = data();
  for (const sort of ["quality-asc", "quality-desc"] as const)
    expect(queryAll(source, { ...emptyQuery(), sort }).rows.map((row) => row.id)).toEqual([1, 2]);
  const search = allSearchSchema.parse({
      layout: "table",
      items: { q: "花 & #", colors: ["红色花朵", "红色花朵"] },
    }),
    compact = compactAllSearch(search);
  expect(allSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
    search,
  );
  expect(compactAllSearch({})).toEqual({});
});

test("旧URL中的标签筛选被忽略，保留其他查询条件且不再写回", () => {
  const search = allSearchSchema.parse({
    layout: "table",
    items: { gameplayTags: ["999"], q: "花材", colors: ["红色花朵"], sort: "name-desc" },
  });
  expect(search).toEqual({
    layout: "table",
    items: { ...emptyQuery(), q: "花材", colors: ["红色花朵"], sort: "name-desc" },
  });
  expect(compactAllSearch(search)).toEqual({
    layout: "table",
    items: { q: "花材", colors: ["红色花朵"], sort: "name-desc" },
  });
  expect(queryAll(data(), search.items).rows.map((row) => row.id)).toEqual([1]);
  const legacyOnly = allSearchSchema.parse({ items: { gameplayTags: ["999"] } });
  expect(queryAll(data(), legacyOnly.items).total).toBe(2);
  expect(compactAllSearch(legacyOnly)).toEqual({});
});

test("旧标签参数不产生筛选摘要，剩余业务筛选可单独移除或清空", () => {
  const source = data(),
    query = allSearchSchema.parse({
      items: { gameplayTags: ["10"], colors: ["红色花朵"] },
    }).items,
    groups = filterGroups(source);
  const removed: { key: string; values: string[] }[] = [];
  const chips = collectionFilterChips(
    groups,
    query,
    (key, values) => removed.push({ key, values }),
    { value: "", clear: () => {} },
  );
  expect(chips.map((chip) => chip.label)).toEqual(["颜色：红色花朵"]);
  chips[0]!.remove();
  expect(removed).toEqual([{ key: "colors", values: [] }]);
  expect(
    collectionFilterChips(groups, emptyQuery(), () => {}, { value: "", clear: () => {} }),
  ).toEqual([]);
});
