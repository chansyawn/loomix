import { listFilterChips } from "../omnidex/filter-chips";
import { flattenFilterOptions } from "../omnidex/filter-types";
import { expect, test } from "vite-plus/test";
import { defaultParseSearch, defaultStringifySearch } from "@tanstack/react-router";
import { catalogFixture, imageIndexFixture, addFixtureRecords } from "../omnidex-fixture";
import { createOmnidexCatalog } from "../omnidex/catalog";
import { queryCatalog, filterGroups } from "./query";
import { catalogSearchSchema, compactCatalogSearch, emptyQuery } from "./search";
import { plantItemFixture, plantSeedFixture, plantsDataFixture } from "../plants/fixture";

function groupRecords(memberIds: number[] | null) {
  return (["furniture", "clothing", "creature", "plant", "dish"] as const).map(
    (memberKind, index) => ({
      id: 1000 + index,
      name: `集合${memberKind}`,
      description: "集合专属介绍",
      image: null,
      quality: null,
      memberKind,
      memberIds,
      acquisition: [{ sourceId: 99, label: "集合专属来源" }],
    }),
  );
}

function data(...records: object[]) {
  const { catalog, gameplayTags } = catalogFixture();
  gameplayTags.tags.push(
    { id: 1, internalName: "颜色", parentId: null, displayName: null },
    { id: 2, internalName: "材质", parentId: null, displayName: null },
    { id: 3, internalName: "艺术风格", parentId: null, displayName: null },
    {
      id: 11,
      internalName: "颜色_花红",
      parentId: 1,
      displayName: "红色花朵",
    },
    { id: 12, internalName: "材质_木", parentId: 2, displayName: "木质" },
    { id: 13, internalName: "风格_自然", parentId: 3, displayName: "自然" },
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
      kind: "material",
      category: null,
      acquisition: [{ sourceId: 5, label: "采集" }],
      tagIds: [11, 12, 13],
    },
    {
      id: 2,
      name: "第二件",
      quality: null,
      image: null,
      description: null,
      kind: "material",
      category: null,
      acquisition: null,
    },
  );
  addFixtureRecords(catalog, gameplayTags, ...records);
  catalog.items.push({ kind: "reference", id: 99, name: "隐藏材料", description: null });
  return createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
}
test("搜索只匹配正式物品的显示名称及其拼音", () => {
  const source = data();
  for (const q of ["花材", "huacai", "hc"]) {
    expect(queryCatalog(source, { ...emptyQuery(), q }).rows.map((row) => row.id)).toEqual([1]);
  }
  for (const q of ["1", "白名单", "隐藏材料"]) {
    expect(queryCatalog(source, { ...emptyQuery(), q }).total).toBe(0);
  }
});
test("原始标签名称、枚举及显示名不参与文本搜索", () => {
  const source = data();
  for (const q of ["植物", "颜色_花红", "redflower", "红色花朵", "Wood", "自然"]) {
    expect(queryCatalog(source, { ...emptyQuery(), q }).total).toBe(0);
  }
});
test("标签与文本、类别、品阶及获取来源取交集", () => {
  const source = data();
  expect(
    queryCatalog(source, {
      ...emptyQuery(),
      tags: ["11", "12", "13"],
      q: "huacai",
      categories: ["miscellaneous"],
      qualities: ["2"],
      acquisition: ["5"],
    }).rows.map((row) => row.id),
  ).toEqual([1]);
  expect(queryCatalog(source, { ...emptyQuery(), tags: ["11"], qualities: ["1"] }).total).toBe(0);
  for (const patch of [{ q: "不存在" }, { categories: ["clothing"] }, { acquisition: ["999"] }]) {
    expect(queryCatalog(source, { ...emptyQuery(), tags: ["11"], ...patch }).total).toBe(0);
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
    expect(queryCatalog(source, { ...emptyQuery(), sort }).rows.map((row) => row.id)).toEqual([
      1, 2,
    ]);
  const search = catalogSearchSchema.parse({
      layout: "table",
      items: { q: "花 & #", tags: ["11", "11"], tagMode: "or" },
    }),
    compact = compactCatalogSearch(search);
  expect(catalogSearchSchema.parse(defaultParseSearch(defaultStringifySearch(compact)))).toEqual(
    search,
  );
  expect(compactCatalogSearch({})).toEqual({});
});

test.each([{ memberIds: [] }, { memberIds: null }])(
  "全部页通过黑名单排除五类集合，成员为 $memberIds",
  ({ memberIds }) => {
    const groups = groupRecords(memberIds);
    const source = data(...groups);
    const result = queryCatalog(source, emptyQuery());
    expect(result.rows.map((row) => row.id)).toEqual([1, 2]);
    expect(result.total).toBe(source.rows.length - groups.length);
    for (const group of groups) {
      for (const q of [String(group.id), group.name, group.description])
        expect(queryCatalog(source, { ...emptyQuery(), q }).total).toBe(0);
    }
    for (const category of ["furniture", "clothing", "creatures", "plants", "dishes"])
      expect(queryCatalog(source, { ...emptyQuery(), categories: [category] }).total).toBe(0);
  },
);

test("只有集合时结果为空，动态筛选排除集合属性及空品阶", () => {
  const { catalog, gameplayTags } = catalogFixture();
  addFixtureRecords(catalog, gameplayTags, ...groupRecords(null));
  const source = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  expect(queryCatalog(source, emptyQuery())).toEqual({ rows: [], total: 0 });
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
    kind: "appearance",
    category: "发型",
    acquisition: null,
  });
  const source = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags);
  expect(queryCatalog(source, emptyQuery()).rows.map((row) => row.id)).toEqual([10, 20, 30]);
  for (const [q, category, id] of [
    ["种子", "plants", 20],
    ["发型", "clothing", 30],
  ] as const)
    expect(
      queryCatalog(source, { ...emptyQuery(), q, categories: [category] }).rows.map(
        (row) => row.id,
      ),
    ).toEqual([id]);
});

test("友邻服饰进入全部页搜索和独立类别筛选", () => {
  const source = data({
    id: 40,
    name: "云果手套",
    description: "友邻服饰",
    quality: 1,
    image: null,
    kind: "neighborOutfit",
    category: "手套",
    acquisition: null,
    neighborId: 1010,
    playerItemId: null,
    modelPaths: { small: null, medium: "NpcOutfits/Medium/40", big: null },
  });
  expect(queryCatalog(source, { ...emptyQuery(), q: "云果" }).rows.map((row) => row.id)).toEqual([
    40,
  ]);
  expect(
    queryCatalog(source, { ...emptyQuery(), categories: ["neighborOutfit"] }).rows.map(
      (row) => row.id,
    ),
  ).toEqual([40]);
});

test("白名单策略隐藏白名单外根与未引用分支，并静默丢弃隐藏标签", () => {
  const { catalog, gameplayTags } = catalogFixture();
  gameplayTags.tags.push(
    { id: 1, internalName: "颜色", parentId: null, displayName: null },
    { id: 2, internalName: "食材_红色", parentId: 1, displayName: null },
    { id: 3, internalName: "未使用", parentId: 1, displayName: null },
    { id: 4, internalName: "饮食", parentId: null, displayName: null },
    { id: 5, internalName: "食材_杯", parentId: 4, displayName: null },
  );
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      id: 1,
      name: "红杯",
      description: null,
      quality: null,
      image: null,
      kind: "material",
      category: null,
      acquisition: null,
      tagIds: [2, 5],
    },
    {
      id: 2,
      name: "空标签",
      description: null,
      quality: null,
      image: null,
      kind: "material",
      category: null,
      acquisition: null,
      tagIds: [],
    },
  );
  const source = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags, {
    tagPolicy: {
      rootNames: ["颜色"],
      labelOverrides: { 食材_红色: "红色" },
      labelPrefixes: ["食材_", "容器_"],
    },
  });
  const tagGroup = filterGroups(source).find((group) => group.key === "tags")!;
  const options = flattenFilterOptions(tagGroup.options);
  expect(options.map((option) => option.value)).toEqual(["1", "2"]);
  expect(options[1]).toMatchObject({ label: "红色", chipLabel: "标签：颜色 / 红色" });
  expect(source.tags.acceptSelection(["1", "2", "5", "999"])).toEqual(["1", "2"]);
  expect(
    queryCatalog(source, { ...emptyQuery(), tags: source.tags.acceptSelection(["5"]) }).total,
  ).toBe(2);
});

test("标签路径和未知标签产生可独立移除的摘要", () => {
  const source = data(),
    query = catalogSearchSchema.parse({
      items: { tags: ["1", "11", "999"] },
    }).items,
    groups = filterGroups(source, query.tags);
  const removed: { key: string; values: string[] }[] = [];
  const chips = listFilterChips(groups, query, (key, values) => removed.push({ key, values }), {
    value: "",
    clear: () => {},
  });
  expect(chips.map((chip) => chip.label)).toEqual([
    "标签：颜色",
    "标签：颜色 / 红色花朵",
    "未知标签（999）",
  ]);
  chips[0]!.remove();
  expect(removed).toEqual([{ key: "tags", values: ["11", "999"] }]);
  expect(queryCatalog(source, query).total).toBe(0);
  expect(queryCatalog(source, { ...query, tagMode: "or" }).rows.map((row) => row.id)).toEqual([1]);
  expect(listFilterChips(groups, emptyQuery(), () => {}, { value: "", clear: () => {} })).toEqual(
    [],
  );
});
