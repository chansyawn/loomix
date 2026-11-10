import { emptyDataset } from "@loomix/schema/dataset";
import { fixtureSource } from "../collection-fixture";
import { parseNeighbors } from "@loomix/schema/neighbors";
import type { Assets } from "@loomix/schema/assets";
import { fixtureContext } from "../collection-fixture";

export function neighborFixture() {
  const neighbors = ["蛮蛮", "幻雪", "图塔", "纳蕾娜"].map((name, index) => ({
    id: index + 1,
    name,
    bodyType: "medium",
    scaleValue: null,
    avatar: null,
    npc2Path: `Avatar/${index + 1}`,
  }));
  const database = parseNeighbors({
    ...fixtureContext,
    kind: "neighbors",
    neighbors,
    stars: neighbors.map((neighbor, index) => ({
      key: `star:${neighbor.id}`,
      neighborId: neighbor.id,
      galaxyName: index < 2 ? "禾夏" : "帕沙",
      galaxyIndex: 1,
      systemIndex: 1,
      starIndex: index,
      name: `${neighbor.name}的星球`,
      galaxyModelPath: null,
      playerModelPath: null,
      skyModelPath: null,
      image: { assetId: "star", variant: "illustration" },
    })),
    stories: [1, 2].map((chapter) => ({
      key: `1:${chapter}`,
      neighborId: 1,
      chapter,
      title: chapter === 1 ? "启程" : "归来",
      paragraphs: [
        {
          sequence: 1,
          text: chapter === 1 ? "<i>第一行\n<b>第二行</b></i>" : null,
          image: { assetId: "story", variant: "illustration" },
        },
      ],
    })),
    travelReactions: [
      {
        key: "fallback:1",
        neighborId: null,
        variantId: 1,
        conditionType: null,
        threshold: null,
        resourceCategory: null,
        secondaryThreshold: null,
        reactionAsset: null,
        text: null,
      },
      {
        key: "1:1",
        neighborId: 1,
        variantId: 1,
        conditionType: "Npc_Get_Items_Num_In_Travel",
        threshold: "4",
        resourceCategory: "6",
        secondaryThreshold: "2",
        reactionAsset: null,
        text: "旅行真开心！",
      },
    ],
    friendshipRules: [],
    eventTags: [],
    additionalImages: [
      {
        key: "favour:1",
        category: "favour",
        neighborId: 1,
        image: { assetId: "favour", variant: "illustration" },
      },
      {
        key: "favour:3",
        category: "favour",
        neighborId: 3,
        image: { assetId: "favour", variant: "illustration" },
      },
    ],
    giftPreferences: [
      { key: "1:dislike", neighborId: 1, level: "dislike", itemIds: [107], tagIds: [] },
      { key: "1:love", neighborId: 1, level: "love", itemIds: [106], tagIds: [] },
      { key: "1:favor", neighborId: 1, level: "favor", itemIds: [], tagIds: [1, 2] },
      { key: "3:love", neighborId: 3, level: "love", itemIds: [107], tagIds: [] },
    ],
    resources: [
      ...neighbors.map((neighbor) => neighbor.npc2Path),
      "UISprite/Star.png",
      "UISprite/Story.png",
    ]
      .sort()
      .map((path) => ({ path, kind: "other", relatedNeighborIds: [] })),
  });
  const mapping: Assets = {
    ...fixtureContext,
    kind: "assets",
    images: ["star", "story", "favour"].map((assetId, index) => ({
      assetId,
      variant: "illustration",
      file: `assets/${(index === 2 ? "b" : "a").repeat(64)}.webp`,
      sha256: (index === 2 ? "b" : "a").repeat(64),
      bytes: 1,
      width: 100,
      height: 100,
    })),
  };
  const catalog = emptyDataset(fixtureContext, fixtureSource).catalog;
  for (const id of [6, 7]) {
    catalog.references.push({ id: id + 100, name: id === 6 ? "星空卡片" : "海岛卡片" });
  }
  const gameplayTags = {
    ...fixtureContext,
    kind: "gameplay-tags" as const,
    tags: [
      { id: 1, displayName: "树生水果", internalName: "水果", enumName: null, parentId: null },
      { id: 2, displayName: null, internalName: "含水果", enumName: null, parentId: null },
    ],
  };
  return { database, mapping, catalog, gameplayTags };
}
