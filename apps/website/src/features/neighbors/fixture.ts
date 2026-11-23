import { addFixtureRecords } from "../collection-fixture";
import { parseNeighbors } from "@loomix/schema/neighbors";
import type { Neighbor } from "@loomix/schema/neighbors";
import type { ImageIndex } from "@loomix/schema/assets";
import type { Catalog } from "@loomix/schema/catalog";
import type { GameplayTags } from "@loomix/schema/gameplay-tags";

function asset(assetId: string, variant: "icon" | "illustration", hash: string) {
  return {
    assetId,
    variant,
    file: `assets/${hash}.webp`,
    sha256: hash,
    bytes: 1,
    width: 100,
    height: 100,
  };
}

const illustration = (assetId: string) => ({ assetId, variant: "illustration" as const });
const noGift = { itemIds: [], tagIds: [] };
const profiles: Neighbor["profile"][] = [
  { englishName: "Manna", nickname: "阿蛮", birthday: { month: 2, day: 22 } },
  { englishName: "Mianduo", nickname: "咪朵", birthday: { month: 7, day: 5 } },
];

export function neighborFixture() {
  const neighbors = ["蛮蛮", "幻雪", "图塔", "纳蕾娜"].map((name, index): Neighbor => ({
    id: index + 1,
    name,
    bodyType: "medium",
    profile: profiles[index] ?? { englishName: null, nickname: null, birthday: null },
    images: {
      favour: index === 0 || index === 2 ? illustration("favour") : null,
      role: index < 2 ? illustration("role") : null,
    },
    stars: [
      {
        name: `${name}的星球`,
        galaxy: index < 2 ? "禾夏" : "帕沙",
        image: illustration("star"),
      },
    ],
    abilities: index === 0 ? [{ unlockLevel: 6, name: "切磋", description: "可以和蛮蛮切磋" }] : [],
    house:
      index === 0
        ? {
            stages: [
              {
                id: 1011,
                level: 1,
                name: "蛮蛮的草顶小棚",
                description: null,
                image: illustration("houseStage"),
              },
              {
                id: 1012,
                level: 2,
                name: "蛮蛮的小屋",
                description: "小屋说明",
                image: illustration("houseStage"),
              },
            ],
          }
        : null,
    stories:
      index === 0
        ? [2, 1].map((chapter) => ({
            chapter,
            title: chapter === 1 ? "启程" : "归来",
            paragraphs: [
              {
                layout: chapter === 1 ? "image-left" : "image",
                text: chapter === 1 ? "<i>第一行\n<b>第二行</b></i>" : null,
                image: illustration("story"),
              } as const,
            ],
          }))
        : [],
    gifts:
      index === 0
        ? {
            love: { itemIds: [106], tagIds: [] },
            favor: { itemIds: [], tagIds: [1, 2] },
            dislike: { itemIds: [107], tagIds: [] },
          }
        : index === 2
          ? { love: { itemIds: [107, 1201], tagIds: [] }, favor: noGift, dislike: noGift }
          : { love: noGift, favor: noGift, dislike: noGift },
  }));
  const database = parseNeighbors({ neighbors });
  const mapping: ImageIndex = {
    images: [
      asset("star", "illustration", "a".repeat(64)),
      asset("story", "illustration", "a".repeat(64)),
      asset("favour", "illustration", "b".repeat(64)),
      asset("role", "illustration", "c".repeat(64)),
      asset("houseStage", "illustration", "4".repeat(64)),
      asset("item", "icon", "5".repeat(64)),
    ],
  };
  const catalog: Catalog = { items: [], collections: [], creationCardSets: [] };
  const gameplayTags: GameplayTags = {
    tags: [
      { id: 1, displayName: "树生水果", internalName: "水果", parentId: null },
      { id: 2, displayName: null, internalName: "含水果", parentId: null },
    ],
  };
  addFixtureRecords(
    catalog,
    gameplayTags,
    { kind: "reference", id: 106, name: "星空卡片" },
    { kind: "reference", id: 107, name: "海岛卡片" },
    {
      kind: "material",
      id: 1201,
      name: "星星石",
      image: { assetId: "item", variant: "icon" },
      quality: 1,
    },
  );
  return { database, mapping, catalog, gameplayTags };
}
