import { expect, test } from "vite-plus/test";
import { createImageResolver } from "@loomix/schema/assets";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { itemGiftPreferences, toNeighborsView } from "./view";
import { neighborFixture } from "./fixture";
import { addFixtureRecords } from "../omnidex-fixture";
import { neighborProfileFields } from "./overview-fields";

test("具体礼物按物品 ID 和偏好等级反查友邻，忽略同号标签和重复点名", () => {
  const { database, mapping, gameplayTags } = neighborFixture();
  gameplayTags.tags.push({ id: 107, internalName: "同号标签", parentId: null, displayName: null });
  database.neighbors[1]!.gifts.favor = { itemIds: [107, 107], tagIds: [] };
  database.neighbors[3]!.gifts.love = { itemIds: [], tagIds: [107] };
  const image = createImageResolver(mapping);
  const tagIndex = createGameplayTagIndex(gameplayTags.tags);
  expect(itemGiftPreferences(database, { id: 107, tagIds: [] }, tagIndex, image)).toMatchObject([
    { level: "love", neighbors: [{ id: 3, avatar: null, specified: true, tags: [] }] },
    {
      level: "favor",
      neighbors: [{ id: 2, avatar: `assets/${"c".repeat(64)}.webp`, specified: true, tags: [] }],
    },
    {
      level: "dislike",
      neighbors: [{ id: 1, avatar: `assets/${"c".repeat(64)}.webp`, specified: true, tags: [] }],
    },
  ]);
  expect(itemGiftPreferences(database, { id: 1, tagIds: [] }, tagIndex, image)).toEqual([]);
});

test("各等级独立匹配直接标签和祖先，同级合并指定物品和多条依据", () => {
  const { database, mapping, gameplayTags } = neighborFixture();
  gameplayTags.tags.push(
    { id: 3, internalName: "苹果", displayName: null, parentId: 1 },
    { id: 4, internalName: "青苹果", displayName: null, parentId: 3 },
    { id: 5, internalName: "其他水果", displayName: "青苹果", parentId: 1 },
  );
  database.neighbors[0]!.gifts.love = { itemIds: [50], tagIds: [1, 4, 1] };
  database.neighbors[0]!.gifts.dislike = { itemIds: [], tagIds: [3] };
  database.neighbors[1]!.gifts.favor = { itemIds: [], tagIds: [4] };
  database.neighbors[3]!.gifts.dislike = { itemIds: [], tagIds: [5] };
  const preferences = (id: number, tagIds: number[]) =>
    itemGiftPreferences(
      database,
      { id, tagIds },
      createGameplayTagIndex(gameplayTags.tags),
      createImageResolver(mapping),
    );
  expect(preferences(50, [4, 4])).toMatchObject([
    { level: "love", neighbors: [{ id: 1, specified: true, tags: ["树生水果", "青苹果"] }] },
    {
      level: "favor",
      neighbors: [
        { id: 1, specified: false, tags: ["树生水果"] },
        { id: 2, specified: false, tags: ["青苹果"] },
      ],
    },
    { level: "dislike", neighbors: [{ id: 1, specified: false, tags: ["苹果"] }] },
  ]);
  expect(preferences(51, [1])).toMatchObject([
    { level: "love", neighbors: [{ id: 1, specified: false, tags: ["树生水果"] }] },
    { level: "favor", neighbors: [{ id: 1, specified: false, tags: ["树生水果"] }] },
  ]);
});

function fixture() {
  const value = neighborFixture();
  return {
    ...value,
    view: toNeighborsView(
      value.database,
      createImageResolver(value.mapping),
      value.catalog,
      value.gameplayTags,
    ),
  };
}

test("derives neighbor relationships from their owning entities", () => {
  const { view } = fixture();
  expect(view.neighbors).toHaveLength(4);
  expect(view.neighbors[0].stories.map((story) => story.chapter)).toEqual([1, 2]);
});

test("derives deduplicated galaxies for card tags, tables and filters", () => {
  const { view } = fixture();
  expect(view.neighbors.map(({ galaxies }) => galaxies)).toEqual([
    ["禾夏"],
    ["禾夏"],
    ["帕沙"],
    ["帕沙"],
  ]);
  expect(view.galaxies).toEqual(["禾夏", "帕沙"]);
});

test("selects the same portrait for cards and detail, with a role illustration fallback", () => {
  const { database, mapping, catalog, gameplayTags, view } = fixture();
  const favour = { image: `assets/${"b".repeat(64)}.webp`, label: "好感插画" };
  const role = { image: `assets/${"c".repeat(64)}.webp`, label: "头像" };
  expect(view.neighbors.map(({ portrait }) => portrait)).toEqual([favour, role, favour, null]);
  const missingAssets = {
    ...mapping,
    images: mapping.images.filter((entry) => entry.assetId !== "favour"),
  };
  const missingView = toNeighborsView(
    database,
    createImageResolver(missingAssets),
    catalog,
    gameplayTags,
  );
  expect(missingView.neighbors.map(({ portrait }) => portrait)).toEqual([role, role, null, null]);
});

test("formats profile fields for display", () => {
  const { view } = fixture();
  expect(view.neighbors[0].profile).toEqual({
    englishName: "Manna",
    nickname: "阿蛮",
    birthday: "2 月 22 日",
  });
  expect(view.neighbors[2].profile).toEqual({
    englishName: null,
    nickname: null,
    birthday: null,
  });
});

test("maps abilities with their unlock level", () => {
  const { view } = fixture();
  expect(view.neighbors[0].abilities).toEqual([
    { unlockLevel: 6, name: "切磋", description: "可以和蛮蛮切磋" },
  ]);
  expect(view.neighbors[1].abilities).toEqual([]);
});

test("resolves house stages", () => {
  const { view } = fixture();
  const house = view.neighbors[0].house;
  expect(house?.stages.map((stage) => stage.name)).toEqual(["蛮蛮的草顶小棚", "蛮蛮的小屋"]);
  expect(house?.stages[0].image).toBe(`assets/${"4".repeat(64)}.webp`);
  expect(view.neighbors[1].house).toBeNull();
});

test("resolves ordered preferences with record links without mixing neighbors", () => {
  const { view } = fixture();
  expect(view.neighbors[0].preferences).toEqual([
    {
      level: "love",
      name: "喜爱",
      items: [{ id: 106, name: "星空卡片", recordId: null, image: null }],
      tags: [],
    },
    {
      level: "favor",
      name: "好感",
      items: [],
      tags: [
        { id: 1, name: "树生水果", filterable: false },
        { id: 2, name: "含水果", filterable: false },
      ],
    },
    {
      level: "dislike",
      name: "反感",
      items: [{ id: 107, name: "海岛卡片", recordId: null, image: null }],
      tags: [],
    },
  ]);
  expect(view.neighbors[2].preferences[0].items).toEqual([
    { id: 107, name: "海岛卡片", recordId: null, image: null },
    {
      id: 1201,
      name: "星星石",
      recordId: 1201,
      image: `assets/${"5".repeat(64)}.webp`,
    },
  ]);
  expect(view.neighbors[1].preferences).toEqual([]);
});

test("喜好保留不可筛选的标签和没有详情的物品，仅对有效目标提供链接", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  gameplayTags.tags.push({ id: 3, internalName: "颜色", displayName: null, parentId: null });
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 300, kind: "neighborOutfit", name: "红衣", tagIds: [3] },
    { id: 301, kind: "inspoCard", name: "创想卡" },
  );
  database.neighbors[0].gifts.love = { tagIds: [3, 1], itemIds: [300, 301] };
  const group = toNeighborsView(database, createImageResolver(mapping), catalog, gameplayTags)
    .neighbors[0].preferences[0];
  expect(group.tags.map(({ id, filterable }) => [id, filterable])).toEqual([
    [3, true],
    [1, false],
  ]);
  expect(group.items.map(({ recordId }) => recordId)).toEqual([300, null]);
});

test("多星球只列出已知的星系归属，缺失的个人资料留空", () => {
  const fields = neighborProfileFields({
    ...fixture().view.neighbors[2],
    stars: [
      { name: "星球甲", galaxy: "禾夏" },
      { name: "星球乙", galaxy: null },
    ],
  });
  expect(fields.map(({ label, value }) => [label, value])).toEqual([
    ["昵称", null],
    ["英文名", null],
    ["生日", null],
    ["所属星球", "星球甲、星球乙"],
    ["所属星系", "星球甲 · 禾夏星系"],
  ]);
});

test("rejects unknown tags and names unknown preference items", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  database.neighbors[0]!.gifts.love = { itemIds: [106, 999], tagIds: [999] };
  const image = createImageResolver(mapping);
  expect(() => toNeighborsView(database, image, catalog, gameplayTags)).toThrow(
    "Unknown GameplayTag 999",
  );
  database.neighbors[0]!.gifts.love.tagIds = [1];
  expect(
    toNeighborsView(database, image, catalog, gameplayTags).neighbors[0].preferences[0],
  ).toEqual({
    level: "love",
    name: "喜爱",
    items: [
      { id: 106, name: "星空卡片", recordId: null, image: null },
      { id: 999, name: "未收录物品（999）", recordId: null, image: null },
    ],
    tags: [{ id: 1, name: "树生水果", filterable: false }],
  });
});

test("missing portrait assets do not fall back to a star illustration", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  const starOnly = { images: mapping.images.filter((entry) => entry.assetId === "star") };
  expect(
    toNeighborsView(database, createImageResolver(starOnly), catalog, gameplayTags).neighbors[0]
      .portrait,
  ).toBeNull();
});

test("preserves story layout intent when illustrations cannot be resolved", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  const view = toNeighborsView(
    database,
    createImageResolver({ ...mapping, images: [] }),
    catalog,
    gameplayTags,
  );
  expect(view.neighbors[0].stories.map((story) => story.paragraphs[0])).toEqual([
    expect.objectContaining({ layout: "image-left", image: null }),
    expect.objectContaining({ layout: "image", image: null }),
  ]);
});
