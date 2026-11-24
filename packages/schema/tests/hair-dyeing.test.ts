import { expect, test } from "vite-plus/test";
import { createFlowerDyeingMatcher, emptyHairDyeing } from "../src/hair-dyeing/index.ts";
import type { HairDyeing } from "../src/hair-dyeing/index.ts";
import { parseDataset } from "../src/dataset/index.ts";
import { referencedImages } from "../src/dataset/images.ts";
import { datasetFixture, material, reference } from "./fixture.ts";

test("鲜花双标签先折叠，配花无序并按色组排序及规则 ID 取首个", () => {
  const group = (
    id: number,
    sort: number,
    flowerMatchEnabled = true,
  ): HairDyeing["colorGroups"][number] => ({
    id,
    name: null,
    colorBlockIds: [],
    displayColor: [0, 0, 0, 0],
    icon: null,
    unlock: { mode: "full", sort, flowerMatchEnabled, unlockCost: null, dyeCost: null },
  });
  const orange = {
    id: 1,
    groupId: 262,
    outputTag: "橙色",
    singleTag: "橙色",
    pairTags: ["白色", "黄色"],
  } satisfies HairDyeing["flowerRules"][number];
  const match = createFlowerDyeingMatcher({
    ...emptyHairDyeing(),
    flowerInputs: [
      { itemId: 50199, colorTags: ["白色"] },
      { itemId: 50203, colorTags: ["黄色"] },
      { itemId: 56237, colorTags: ["白色", "黄色"] },
      { itemId: 56001, colorTags: ["黄色"] },
      { itemId: 56002, colorTags: ["黄色", "紫色"] },
    ],
    colorGroups: [group(262, 3), group(263, 4), group(264, 1, false)],
    flowerRules: [
      { ...orange, id: 6 },
      { ...orange, id: 5, groupId: 263 },
      { ...orange, id: 2, groupId: 264 },
      orange,
    ],
  });
  expect(match(50199, 50203)).toEqual(orange);
  expect(match(50203, 50199)).toEqual(orange);
  expect(match(56237)).toEqual(orange);
  expect(match(50203, 50203)).toBeNull();
  expect(match(50203, 56001)).toBeNull();
  expect(match(56002)).toBeNull();
  expect(match(1)).toBeNull();
});

test("校验染色跨文档引用并保留区域缺省、显式空和组外默认色", () => {
  const dataset = datasetFixture();
  dataset.catalog.items = [
    { ...material(60688), kind: "appearance", category: "发型" },
    reference(200023),
  ];
  dataset.hairDyeing = {
    ...emptyHairDyeing(),
    hairstyleConfigs: [
      {
        itemId: 60688,
        regions: [
          { id: 1, name: "底色", colorGroupIds: [262], defaultColorBlockId: 267 },
          { id: 2, name: "挑染", colorGroupIds: null, defaultColorBlockId: null },
          { id: 3, name: "发绳变色", colorGroupIds: [], defaultColorBlockId: null },
        ],
      },
    ],
    colorGroups: [
      {
        id: 262,
        name: "橙色系",
        colorBlockIds: [224],
        displayColor: [231, 124, 53, 255],
        icon: null,
        unlock: {
          mode: "full",
          sort: 3,
          flowerMatchEnabled: true,
          unlockCost: { itemId: 200023, quantity: 240 },
          dyeCost: null,
        },
      },
    ],
    colorBlocks: [
      { id: 224, displayColor: [231, 124, 53, 255], visualKind: "tint", icon: null },
      {
        id: 267,
        displayColor: [206, 199, 186, 255],
        visualKind: "tint",
        icon: { assetId: "default-hair-color", variant: "icon" },
      },
    ],
  };
  expect(parseDataset(dataset).hairDyeing).toEqual(dataset.hairDyeing);
  expect(referencedImages(dataset)).toEqual([{ assetId: "default-hair-color", variant: "icon" }]);
  const missingReferences = parseDataset(dataset);
  missingReferences.hairDyeing.colorBlocks.pop();
  missingReferences.catalog.items.pop();
  expect(() => parseDataset(missingReferences)).toThrow(
    /Unknown color block 267[\s\S]*Unknown dye material 200023/,
  );
});
