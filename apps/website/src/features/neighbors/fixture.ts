import {
  neighborImagePaths,
  parseNeighborDatabase,
  type NeighborImages,
} from "@loomix/neighbor-schema";

export function neighborFixture() {
  const source = {
    gameVersion: "0.95.2",
    dataRevision: 1449213,
    resourceRevision: 1391927,
    manifestId: "5662883",
  };
  const neighbors = ["蛮蛮", "幻雪", "图塔", "纳蕾娜"].map((nameZh, index) => ({
    id: index + 1,
    nameZh,
    bodyType: "medium",
    scaleValue: null,
    avatarPath: null,
    npc2Path: `Avatar/${index + 1}`,
    starKeys: [`star:${index + 1}`],
    storyKeys: index === 0 ? ["1:1", "1:2"] : [],
    furnishingThemeIds: index === 3 ? [7] : [],
    furnishingThemeKeys: index === 3 ? ["theme:a", "theme:b"] : [],
    rewardItemIds: [],
    assetPaths: [],
  }));
  const database = parseNeighborDatabase({
    schemaVersion: 1,
    source,
    neighbors,
    stars: neighbors.map((neighbor, index) => ({
      key: `star:${neighbor.id}`,
      npcId: neighbor.id,
      galaxyNameZh: index < 2 ? "禾夏" : "帕沙",
      galaxyIndex: 1,
      systemIndex: 1,
      starIndex: index,
      nameZh: `${neighbor.nameZh}的星球`,
      galaxyModelPath: null,
      playerModelPath: null,
      skyModelPath: null,
      illustrationPath: "UISprite/Star.png",
    })),
    stories: [1, 2].map((chapter) => ({
      key: `1:${chapter}`,
      npcId: 1,
      chapter,
      titleZh: chapter === 1 ? "启程" : "归来",
      paragraphs: [
        {
          sequence: 1,
          bodyZh: chapter === 1 ? "<i>第一行\n<b>第二行</b></i>" : null,
          illustrationPath: "UISprite/Story.png",
        },
      ],
    })),
    travelReactions: [
      {
        key: "fallback:1",
        npcId: null,
        variantId: 1,
        conditionType: null,
        threshold: null,
        resourceCategory: null,
        secondaryThreshold: null,
        reactionAsset: null,
        textZh: null,
      },
      {
        key: "1:1",
        npcId: 1,
        variantId: 1,
        conditionType: "Npc_Get_Items_Num_In_Travel",
        threshold: "4",
        resourceCategory: "6",
        secondaryThreshold: "2",
        reactionAsset: null,
        textZh: "旅行真开心！",
      },
    ],
    furnishingThemes: ["theme:a", "theme:b"].map((key, index) => ({
      id: index === 0 ? null : 7,
      key,
      nameZh: `创想卡集${index}`,
      neighborIds: [4],
      descriptionZh: "完成友邻事件\n完成装修请求",
      cardBagPath: null,
      cardBackgroundPath: null,
      cardBackPath: null,
      topicIconPath: null,
      lockedBackgroundPath: null,
      unlockedBackgroundPath: null,
      themePath: null,
      coverPath: "UISprite/Star.png",
    })),
    encounterIslands: [],
    friendshipRules: [],
    eventTags: [],
    rewards: [],
    assets: [
      ...neighbors.map((neighbor) => neighbor.npc2Path),
      "UISprite/Star.png",
      "UISprite/Story.png",
    ]
      .sort()
      .map((path) => ({ path, kind: "other", relatedNeighborIds: [] })),
  });
  const mapping: NeighborImages = {
    schemaVersion: 1,
    source,
    images: neighborImagePaths(database).map((path) => ({
      path,
      image: `assets/${"a".repeat(64)}.webp`,
    })),
  };
  return { database, mapping };
}
