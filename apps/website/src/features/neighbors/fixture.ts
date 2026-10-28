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
    furnishingThemes: ["theme:a", "theme:b"].map((key, index) => ({
      id: index === 0 ? null : 7,
      key,
      name: `创想卡集${index}`,
      neighborIds: [4],
      description: "完成友邻事件\n完成装修请求",
      cardBagPath: null,
      cardBackgroundPath: null,
      cardBackPath: null,
      topicIconPath: null,
      lockedBackgroundPath: null,
      unlockedBackgroundPath: null,
      themePath: null,
      cover: { assetId: "star", variant: "illustration" },
    })),
    friendshipRules: [],
    eventTags: [],
    rewards: [],
    additionalImages: [],
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
    images: ["star", "story"].map((assetId) => ({
      assetId,
      variant: "illustration",
      file: `assets/${"a".repeat(64)}.webp`,
      sha256: "a".repeat(64),
      bytes: 1,
      width: 100,
      height: 100,
    })),
  };
  return { database, mapping };
}
