import { expect, test } from "vite-plus/test";
import { CATALOG_TAG_FILTER_POLICY } from "../catalog/tag-filter-policy";
import { addFixtureRecords, catalogFixture, imageIndexFixture } from "../omnidex-fixture";
import { createOmnidexCatalog } from "./catalog";
import { entryOverview } from "./entry-overview";
import { giftPreferenceGroup } from "./item-relation-presentation";
import { overviewFieldGroups } from "./overview-fields";

function tag(
  id: number,
  internalName: string,
  parentId: number | null = null,
  displayName: string | null = null,
) {
  return { id, internalName, parentId, displayName };
}

test("筛选标签包含家具类型和尺寸的直接引用，排除不可筛选的同名标签与未直接引用的祖先", () => {
  const { catalog, gameplayTags } = catalogFixture();
  gameplayTags.tags.push(
    tag(1, "家具"),
    tag(2, "起居", 1, "基础家具"),
    tag(3, "座椅", 2),
    tag(4, "单人椅", 3),
    tag(5, "尺寸"),
    tag(6, "尺寸_1_1", 5, "尺寸：1×1"),
    tag(7, "隐藏根"),
    tag(8, "同名标签", 7, "单人椅"),
  );
  addFixtureRecords(
    catalog,
    gameplayTags,
    {
      id: 31,
      kind: "furniture",
      name: "方凳",
      size: { width: 1, depth: 1 },
      tagIds: [1, 3, 4, 6, 8],
    },
    { id: 32, kind: "furniture", name: "长凳", size: { width: 1, depth: 2 }, tagIds: [6] },
    { id: 33, memberKind: "furniture", name: "套组", memberIds: [31, 32] },
  );
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags, {
    tagPolicy: CATALOG_TAG_FILTER_POLICY,
  });
  const overview = (id: number) => entryOverview(data, data.byId.get(id)!);
  expect(overview(31)).toMatchObject({
    detailTags: { furnitureType: [{ id: 4 }], furnitureSize: [{ id: 6, name: "1.0x1.0" }] },
    filterTags: [{ id: 1 }, { id: 3 }, { id: 4 }, { id: 6, name: "尺寸：1×1" }],
  });
  expect(overview(32)).toMatchObject({
    detailTags: { furnitureSize: [] },
    filterTags: [{ id: 6 }],
  });
  expect(overview(33)).toMatchObject({
    tagGroups: [],
    filterTags: [],
    detailTags: { furnitureType: [], furnitureSize: [] },
  });
});

test("通用信息以单个字段按引用顺序平铺所有筛选链接，包括已单列的食品分类、原料特征与风味", () => {
  const { catalog, gameplayTags } = catalogFixture();
  gameplayTags.tags.push(
    tag(1, "食物"),
    tag(2, "食品分类", 1),
    tag(3, "甜点", 2),
    tag(4, "容器类型", 1),
    tag(5, "容器_杯", 4),
    tag(6, "烹饪原料"),
    tag(7, "含水果", 6),
    tag(8, "产区分类"),
    tag(9, "禾夏风味", 8),
  );
  addFixtureRecords(catalog, gameplayTags, {
    id: 31,
    kind: "dish",
    name: "苹果冰",
    tagIds: [1, 7, 3, 9, 5],
  });
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags, {
    tagPolicy: CATALOG_TAG_FILTER_POLICY,
  });
  const overview = entryOverview(data, data.byId.get(31)!);
  expect(overview.tagGroups).toMatchObject([
    { label: "食品分类", tags: [{ id: 3 }] },
    { label: "原料特征", tags: [{ id: 7 }] },
  ]);
  expect(overview.detailTags.origin).toMatchObject([{ name: "禾夏风味", filterable: true }]);
  const effects = { title: "食用效果", fields: [] };
  const preferences = giftPreferenceGroup({
    status: "ready",
    value: [
      {
        level: "favor",
        name: "好感",
        neighbors: [{ id: 1, name: "蛮蛮", avatar: null, specified: false, tags: ["含水果"] }],
      },
    ],
  });
  const groups = overviewFieldGroups(
    overview,
    { image: null, sections: [], consumptionEffects: effects },
    [],
    preferences,
  );
  expect(groups).toMatchObject([
    { title: "基本信息" },
    {
      title: "友邻喜好",
      anchor: "gift-preferences",
      fields: [
        {
          kind: "neighbors",
          label: "好感",
          hash: "preference-favor",
          value: [{ id: 1, caption: "含水果" }],
        },
      ],
    },
    effects,
  ]);
  expect(groups[0].fields.at(-1)).toMatchObject({
    kind: "tags",
    label: "筛选标签",
    fullWidth: true,
    value: [
      { name: "食物", destination: { to: "/catalog", search: { items: { tags: ["1"] } } } },
      { name: "含水果", destination: { to: "/catalog", search: { items: { tags: ["7"] } } } },
      { name: "甜点", destination: { to: "/catalog", search: { items: { tags: ["3"] } } } },
      { name: "禾夏风味", destination: { to: "/catalog", search: { items: { tags: ["9"] } } } },
      { name: "杯", destination: { to: "/catalog", search: { items: { tags: ["5"] } } } },
    ],
  });
});

test("食材浏览保留祖先入口，筛选标签只链接全部页可筛选的直接标签，空值时隐藏字段", () => {
  const { catalog, gameplayTags } = catalogFixture();
  gameplayTags.tags.push(
    tag(1, "食材"),
    tag(2, "食材_素菜", 1),
    tag(3, "食材_水果", 2),
    tag(4, "隐藏根"),
  );
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 31, kind: "plant", name: "苹果", tagIds: [3] },
    { id: 32, kind: "plant", name: "花", tagIds: [4] },
  );
  const data = createOmnidexCatalog(catalog, imageIndexFixture(catalog), gameplayTags, {
    tagPolicy: CATALOG_TAG_FILTER_POLICY,
  });
  const groups = (id: number) =>
    overviewFieldGroups(entryOverview(data, data.byId.get(id)!), { image: null, sections: [] }, []);
  expect(groups(31)).toMatchObject([
    {
      title: "基本信息",
      fields: [
        {
          label: "食材标签",
          value: [
            { key: 2, destination: { to: "/dishes" } },
            { key: 3, destination: { to: "/dishes" } },
          ],
        },
        { label: "筛选标签", value: [{ key: 3, destination: { to: "/catalog" } }] },
      ],
    },
  ]);
  expect(groups(32)[0].fields).toEqual([]);
});
