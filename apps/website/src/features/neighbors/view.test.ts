import { expect, test } from "vite-plus/test";
import { toNeighborsView } from "./view";
import { neighborFixture } from "./fixture";

function fixture() {
  const value = neighborFixture();
  return {
    ...value,
    view: toNeighborsView(value.database, value.mapping, value.catalog, value.gameplayTags),
  };
}

test("derives neighbor relationships from their owning entities", () => {
  const { view } = fixture();
  expect(view.neighbors).toHaveLength(4);
  expect(view.neighbors[0].stories.map((story) => story.chapter)).toEqual([1, 2]);
});

test("uses only the current neighbor's favour illustration without changing the list image", () => {
  const { database, mapping, catalog, gameplayTags, view } = fixture();
  const updated = toNeighborsView(database, mapping, catalog, gameplayTags);
  expect(updated.neighbors[0].image).toBe(`assets/${"a".repeat(64)}.webp`);
  expect(updated.neighbors[0].favourImage).toBe(`assets/${"b".repeat(64)}.webp`);
  expect(updated.neighbors[1].favourImage).toBeNull();
  expect(updated.neighbors[3].favourImage).toBeNull();
  expect(view.neighbors[1].roleImage).toBe(`assets/${"c".repeat(64)}.webp`);
  const missingAssets = {
    ...mapping,
    images: mapping.images.filter((entry) => entry.assetId !== "favour"),
  };
  const missingView = toNeighborsView(database, missingAssets, catalog, gameplayTags);
  expect(missingView.neighbors[0].favourImage).toBeNull();
  expect(missingView.neighbors[0].image).toBe(updated.neighbors[0].image);
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
        { id: 1, name: "树生水果" },
        { id: 2, name: "含水果" },
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
  expect(view.neighbors[1].preferences).toEqual([
    { level: "love", name: "喜爱", items: [], tags: [] },
    { level: "favor", name: "好感", items: [], tags: [] },
    { level: "dislike", name: "反感", items: [], tags: [] },
  ]);
});

test("rejects unknown tags and names unknown preference items", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  database.neighbors[0]!.gifts.love = { itemIds: [106, 999], tagIds: [999] };
  expect(() => toNeighborsView(database, mapping, catalog, gameplayTags)).toThrow(
    "Unknown GameplayTag 999",
  );
  database.neighbors[0]!.gifts.love.tagIds = [1];
  expect(
    toNeighborsView(database, mapping, catalog, gameplayTags).neighbors[0].preferences[0],
  ).toEqual({
    level: "love",
    name: "喜爱",
    items: [
      { id: 106, name: "星空卡片", recordId: null, image: null },
      { id: 999, name: "未收录物品（999）", recordId: null, image: null },
    ],
    tags: [{ id: 1, name: "树生水果" }],
  });
});

test("resolves image references through the common asset directory", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  expect(toNeighborsView(database, mapping, catalog, gameplayTags).neighbors[0].image).toBe(
    `assets/${"a".repeat(64)}.webp`,
  );
  expect(
    toNeighborsView(database, { ...mapping, images: [] }, catalog, gameplayTags).neighbors[0].image,
  ).toBeNull();
});

test("preserves story layout intent when illustrations cannot be resolved", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  const view = toNeighborsView(database, { ...mapping, images: [] }, catalog, gameplayTags);
  expect(view.neighbors[0].stories.map((story) => story.paragraphs[0])).toEqual([
    expect.objectContaining({ layout: "image-left", image: null }),
    expect.objectContaining({ layout: "image", image: null }),
  ]);
});
