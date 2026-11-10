import { expect, test } from "vite-plus/test";
import { toNeighborsView } from "./data";
import { neighborFixture } from "./fixture";

test("derives neighbor relationships from their owning entities", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  const view = toNeighborsView(database, mapping, catalog, gameplayTags);
  expect(view.neighbors).toHaveLength(4);
  expect(view.neighbors[0].stories.map((story) => story.chapter)).toEqual([1, 2]);
  expect(view.neighbors[0].travel[0].reactions[0].text).toBe("旅行真开心！");
});

test("uses only the current neighbor's favour illustration without changing the list image", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  database.additionalImages.unshift(
    {
      key: "shared:favour",
      category: "favour",
      neighborId: null,
      image: { assetId: "star", variant: "illustration" },
    },
    {
      key: "avatar:2",
      category: "avatar",
      neighborId: 2,
      image: { assetId: "star", variant: "illustration" },
    },
  );
  const view = toNeighborsView(database, mapping, catalog, gameplayTags);
  expect(view.neighbors[0].image).toBe(`assets/${"a".repeat(64)}.webp`);
  expect(view.neighbors[0].favourImage).toBe(`assets/${"b".repeat(64)}.webp`);
  expect(view.neighbors[1].favourImage).toBeNull();
  expect(view.neighbors[3].favourImage).toBeNull();
  const missingAssets = {
    ...mapping,
    images: mapping.images.filter((entry) => entry.assetId !== "favour"),
  };
  const missingView = toNeighborsView(database, missingAssets, catalog, gameplayTags);
  expect(missingView.neighbors[0].favourImage).toBeNull();
  expect(missingView.neighbors[0].image).toBe(view.neighbors[0].image);
});

test("resolves ordered preferences without mixing neighbors or expanding tags into items", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  const view = toNeighborsView(database, mapping, catalog, gameplayTags);
  expect(view.neighbors[0].preferences).toEqual([
    { level: "love", name: "喜爱", items: [{ id: 106, name: "星空卡片" }], tags: [] },
    {
      level: "favor",
      name: "好感",
      items: [],
      tags: [
        { id: 1, name: "树生水果" },
        { id: 2, name: "含水果" },
      ],
    },
    { level: "dislike", name: "反感", items: [{ id: 107, name: "海岛卡片" }], tags: [] },
  ]);
  expect(view.neighbors[2].preferences[0].items).toEqual([{ id: 107, name: "海岛卡片" }]);
  expect(view.neighbors[1].preferences).toEqual([
    { level: "love", name: "喜爱", items: [], tags: [] },
    { level: "favor", name: "好感", items: [], tags: [] },
    { level: "dislike", name: "反感", items: [], tags: [] },
  ]);
});

test("rejects unknown tags and deduplicates known preference references", () => {
  const { database, mapping, catalog, gameplayTags } = neighborFixture();
  database.giftPreferences.push({
    key: "1:love:extra",
    neighborId: 1,
    level: "love",
    itemIds: [106, 999],
    tagIds: [999],
  });
  expect(() => toNeighborsView(database, mapping, catalog, gameplayTags)).toThrow(
    "Unknown GameplayTag 999",
  );
  database.giftPreferences.at(-1)!.tagIds = [1, 1];
  expect(
    toNeighborsView(database, mapping, catalog, gameplayTags).neighbors[0].preferences[0],
  ).toEqual({
    level: "love",
    name: "喜爱",
    items: [
      { id: 106, name: "星空卡片" },
      { id: 999, name: "未收录物品（999）" },
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
