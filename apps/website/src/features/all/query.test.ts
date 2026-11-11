import { collectionFilterChips } from "../collection/filter-chips";
import { expect, test } from "vite-plus/test";
import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { catalogFixture, assetsFixture, addFixtureRecords } from "../collection-fixture";
import { createCollectionCatalog } from "../collection/catalog";
import { queryAll, filterGroups } from "./query";
import { allSearchSchema, compactAllSearch, emptyQuery } from "./search";
import { plantItemFixture, plantSeedFixture, plantsDataFixture } from "../plants/fixture";

function groupRecords(memberIds: number[] | null) {
  return (
    ["furniture.set", "clothing.set", "creatures.series", "plants.series", "dishes.series"] as const
  ).map((type, index) => ({
    id: 1000 + index,
    name: `集合${type}`,
    description: "集合专属介绍",
    image: null,
    quality: null,
    type,
    memberIds,
    colors: ["集合专属颜色"],
    materials: ["集合专属材质"],
    styles: ["集合专属风格"],
    acquisition: [{ sourceId: 99, label: "集合专属来源", condition: null }],
  }));
}

function data(...records: object[]) {
  const { catalog, gameplayTags } = catalogFixture();
  gameplayTags.tags.push(
    { id: 1, internalName: "颜色", enumName: null, parentId: null, displayName: null },
    { id: 2, internalName: "材质", enumName: null, parentId: null, displayName: null },
    { id: 3, internalName: "艺术风格", enumName: null, parentId: null, displayName: null },
    {
      id: 11,
      internalName: "颜色_花红",
      enumName: "RedFlower",
      parentId: 1,
      displayName: "红色花朵",
    },
    { id: 12, internalName: "材质_木", enumName: "Wood", parentId: 2, displayName: "木质" },
    { id: 13, internalName: "风格_自然", enumName: "Natural", parentId: 3, displayName: "自然" },
  );
  addFixtureRecords(
    catalog,
    gameplayTags,
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
      tagIds: [11, 12, 13],
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
  addFixtureRecords(catalog, gameplayTags, ...records);
  catalog.references.push({ id: 99, name: "隐藏材料" });
  return createCollectionCatalog(catalog, assetsFixture(catalog), gameplayTags);
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

test.each([{ memberIds: [] }, { memberIds: null }])(
  "全部页通过黑名单排除五类集合，成员为 $memberIds",
  ({ memberIds }) => {
    const groups = groupRecords(memberIds);
    const source = data(...groups);
    const result = queryAll(source, emptyQuery());
    expect(result.rows.map((row) => row.id)).toEqual([1, 2]);
    expect(result.total).toBe(source.rows.length - groups.length);
    for (const group of groups) {
      for (const q of [String(group.id), group.name, group.description])
        expect(queryAll(source, { ...emptyQuery(), q }).total).toBe(0);
    }
    for (const category of ["furniture", "clothing", "creatures", "plants", "dishes"])
      expect(queryAll(source, { ...emptyQuery(), categories: [category] }).total).toBe(0);
  },
);

test("只有集合时结果为空，动态筛选排除集合属性及空品阶", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(catalog, gameplayTags, ...groupRecords(null));
  const source = createCollectionCatalog(catalog, assetsFixture(catalog), gameplayTags);
  expect(queryAll(source, emptyQuery())).toEqual({ rows: [], total: 0 });
  const groups = filterGroups(source);
  for (const key of ["colors", "materials", "styles", "acquisition"])
    expect(groups.find((group) => group.key === key)?.options).toEqual([]);
  expect(groups.find((group) => group.key === "qualities")?.options).not.toContainEqual({
    value: "__missing",
    label: "未提供",
  });
});

test("集合黑名单允许外观和种子参与搜索与类别筛选", () => {
  const { catalog, gameplayTags } = catalogFixture({
    plants: plantsDataFixture({
      items: [plantItemFixture({ id: 10, name: "植株" })],
      series: [],
      seeds: [plantSeedFixture({ id: 20, name: "种子", plantIds: [10] })],
    }),
  });
  addFixtureRecords(catalog, gameplayTags, {
    id: 30,
    name: "发型",
    description: null,
    quality: null,
    image: null,
    type: "appearance",
    subcategory: "发型",
    acquisition: null,
  });
  const source = createCollectionCatalog(catalog, assetsFixture(catalog), gameplayTags);
  expect(queryAll(source, emptyQuery()).rows.map((row) => row.id)).toEqual([10, 20, 30]);
  for (const [q, category, id] of [
    ["种子", "plants", 20],
    ["发型", "clothing", 30],
  ] as const)
    expect(
      queryAll(source, { ...emptyQuery(), q, categories: [category] }).rows.map((row) => row.id),
    ).toEqual([id]);
});

test("旧URL中的记录形式被忽略，保留其他条件且不再写回或生成摘要", () => {
  const source = data(...groupRecords(null));
  const raw = {
    layout: "table",
    items: { kinds: ["group"], q: "花材", colors: ["红色花朵"], sort: "name-desc" },
  };
  const search = allSearchSchema.parse(raw);
  expect(search).toEqual({
    layout: "table",
    items: { ...emptyQuery(), q: "花材", colors: ["红色花朵"], sort: "name-desc" },
  });
  const compact = compactAllSearch(search);
  expect(compact).toEqual({
    layout: "table",
    items: { q: "花材", colors: ["红色花朵"], sort: "name-desc" },
  });
  expect(allSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
    search,
  );
  expect(queryAll(source, search.items).rows.map((row) => row.id)).toEqual([1]);
  const legacyOnly = allSearchSchema.parse({ items: { kinds: ["group"] } });
  expect(queryAll(source, legacyOnly.items).rows.map((row) => row.id)).toEqual([1, 2]);
  expect(compactAllSearch(legacyOnly)).toEqual({});
  expect(
    collectionFilterChips(filterGroups(source), legacyOnly.items, () => {}, {
      value: "",
      clear: () => {},
    }),
  ).toEqual([]);
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
