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
test("标签与文本、类别、品阶及获取来源取交集", () => {
  const source = data();
  expect(
    queryAll(source, {
      ...emptyQuery(),
      tags: ["11", "12", "13"],
      q: "花材",
      categories: ["miscellaneous"],
      qualities: ["2"],
      acquisition: ["5"],
    }).rows.map((row) => row.id),
  ).toEqual([1]);
  expect(queryAll(source, { ...emptyQuery(), tags: ["11"], qualities: ["1"] }).total).toBe(0);
  for (const patch of [{ q: "不存在" }, { categories: ["clothing"] }, { acquisition: ["999"] }]) {
    expect(queryAll(source, { ...emptyQuery(), tags: ["11"], ...patch }).total).toBe(0);
  }
  expect(filterGroups(source).map((group) => group.key)).toEqual([
    "tags",
    "categories",
    "qualities",
    "acquisition",
  ]);
});
test("未知品阶在升降序都排后，查询URL可往返并压缩默认值", () => {
  const source = data();
  for (const sort of ["quality-asc", "quality-desc"] as const)
    expect(queryAll(source, { ...emptyQuery(), sort }).rows.map((row) => row.id)).toEqual([1, 2]);
  const search = allSearchSchema.parse({
      layout: "table",
      items: { q: "花 & #", tags: ["11", "11"], tagMode: "or" },
    }),
    compact = compactAllSearch(search);
  expect(allSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
    search,
  );
  expect(compactAllSearch({})).toEqual({});
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
  expect(groups.find((group) => group.key === "acquisition")?.options).toEqual([]);
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

test("标签路径和未知标签产生可独立移除的摘要", () => {
  const source = data(),
    query = allSearchSchema.parse({
      items: { tags: ["1", "11", "999"] },
    }).items,
    groups = filterGroups(source, query.tags);
  const removed: { key: string; values: string[] }[] = [];
  const chips = collectionFilterChips(
    groups,
    query,
    (key, values) => removed.push({ key, values }),
    { value: "", clear: () => {} },
  );
  expect(chips.map((chip) => chip.label)).toEqual([
    "标签：颜色",
    "标签：颜色 / 红色花朵",
    "未知标签（999）",
  ]);
  chips[0]!.remove();
  expect(removed).toEqual([{ key: "tags", values: ["11", "999"] }]);
  expect(queryAll(source, query).total).toBe(0);
  expect(queryAll(source, { ...query, tagMode: "or" }).rows.map((row) => row.id)).toEqual([1]);
  expect(
    collectionFilterChips(groups, emptyQuery(), () => {}, { value: "", clear: () => {} }),
  ).toEqual([]);
});
