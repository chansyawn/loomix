import { createImageResolver } from "@loomix/schema/assets";
import { emptyHairDyeing, type HairDyeing } from "@loomix/schema/hair-dyeing";
import { expect, test } from "vite-plus/test";
import { hairstylePalette } from "./hair-dyeing";
import { flowerDyeingUses } from "./flower-dyeing";

const colors: HairDyeing["colorGroups"][number]["displayColor"] = [12, 34, 56, 255];
const icon = { assetId: "material", variant: "icon" as const };
const group = (
  id: number,
  sort: number,
  colorBlockIds: number[],
  name: string | null,
): HairDyeing["colorGroups"][number] => ({
  id,
  name,
  colorBlockIds,
  displayColor: colors,
  icon: id === 4 ? icon : null,
  unlock: {
    mode: id === 4 ? "colorful" : "full",
    sort,
    flowerMatchEnabled: false,
    unlockCost: null,
    dyeCost: null,
  },
});
const overall = {
  id: 10,
  name: "整体发色",
  colorGroupIds: [1, 4, 3, 2, 9],
  defaultColorBlockId: 3,
};
const paletteData: HairDyeing = {
  ...emptyHairDyeing(),
  hairstyleConfigs: [
    {
      itemId: 1,
      regions: [
        overall,
        { id: 20, name: "挑染发色", colorGroupIds: [2], defaultColorBlockId: null },
        { id: 30, name: "空区域", colorGroupIds: [9], defaultColorBlockId: 3 },
      ],
    },
    { itemId: 2, regions: [overall] },
  ],
  colorGroups: [
    group(1, 3, [2, 1, 999], "蓝色系"),
    group(2, 2, [1], "深色系"),
    group(3, 2, [2], null),
    group(4, 1, [4], "炫彩"),
    group(9, 0, [999], "缺少色块"),
  ],
  colorBlocks: [
    { id: 1, visualKind: "tint", displayColor: colors, icon: null },
    { id: 2, visualKind: "tint", displayColor: [255, 5, 0, 128], icon: null },
    { id: 3, visualKind: "tint", displayColor: colors, icon: null },
    { id: 4, visualKind: "materialReplacement", displayColor: colors, icon },
  ],
};

test("按区域和解锁顺序列出可用色组，保留色块顺序和透明度", () => {
  const image = createImageResolver({
    images: [
      {
        ...icon,
        file: "assets/material.png",
        sha256: "a".repeat(64),
        bytes: 1,
        width: 32,
        height: 32,
      },
    ],
  });
  const [overall, highlights, defaultOnly] = hairstylePalette(paletteData, 1, image, new Map());
  expect(overall.defaultSwatch?.id).toBe(3);
  expect(highlights.defaultSwatch).toBeNull();
  expect(defaultOnly).toMatchObject({ groups: [], defaultSwatch: { id: 3 } });
  expect(overall.name).toBe("整体发色");
  expect(overall.groups.map(({ name }) => name)).toEqual([
    "炫彩",
    "未命名色系",
    "深色系",
    "蓝色系",
  ]);
  expect(overall.groups[0]).toMatchObject({
    image: "assets/material.png",
    swatches: [{ id: 4, kind: "materialReplacement", image: "assets/material.png" }],
  });
  expect(overall.groups[3].swatches).toMatchObject([
    { id: 2, color: "#FF050080" },
    { id: 1, color: "#0C2238" },
  ]);
  expect(highlights).toMatchObject({
    name: "挑染发色",
    groups: [{ id: 2, swatches: [{ id: 1 }] }],
  });
});

test("缺少图片时保留材质色卡，缺少配置时省略调色盘", () => {
  const image = createImageResolver({ images: [] });
  const regions = hairstylePalette(paletteData, 2, image, new Map());
  expect(regions.map(({ name }) => name)).toEqual(["整体发色"]);
  expect(regions[0].groups[0]).toMatchObject({
    image: null,
    swatches: [{ kind: "materialReplacement", image: null }],
  });
  expect(hairstylePalette(paletteData, 99, image, new Map())).toEqual([]);
});

test("色系分别保留解锁与染发费用，可区分仅供引用的支付物品", () => {
  const color = paletteData.colorGroups[0];
  const data = {
    ...paletteData,
    colorGroups: [
      {
        ...color,
        unlock: {
          ...color.unlock,
          unlockCost: { itemId: 51, quantity: 3 },
          dyeCost: { itemId: 52, quantity: 1 },
        },
      },
    ],
  };
  const payment = { id: 51, name: "染料", image: null, browsable: false };
  const [region] = hairstylePalette(data, 1, () => null, new Map([[51, payment]]));
  expect(region.groups[0].unlockCost).toEqual({ ...payment, quantity: 3 });
  expect(region.groups[0].dyeCost).toMatchObject({ id: 52, quantity: 1, browsable: false });
});

test("分别列出单花结果、配对花朵和可选用该色系的发型", () => {
  const color = paletteData.colorGroups[0];
  const data: HairDyeing = {
    ...paletteData,
    flowerInputs: [
      { itemId: 11, colorTags: ["白"] },
      { itemId: 12, colorTags: ["红"] },
    ],
    colorGroups: [{ ...color, unlock: { ...color.unlock, flowerMatchEnabled: true } }],
    flowerRules: [
      { id: 100, groupId: color.id, singleTag: "白", pairTags: ["红", "白"], outputTag: null },
    ],
    hairstyleConfigs: [
      ...paletteData.hairstyleConfigs,
      { itemId: 3, regions: [{ ...overall, colorGroupIds: [4] }] },
    ],
  };
  const items = new Map([1, 2, 3, 11, 12].map((id) => [id, { id, name: String(id), image: null }]));
  expect(flowerDyeingUses(data, 11, items)).toMatchObject([
    { single: true, partners: [{ id: 12 }], hairstyles: [{ id: 1 }, { id: 2 }] },
  ]);
  expect(flowerDyeingUses(data, 12, items)).toMatchObject([
    { single: false, partners: [{ id: 11 }] },
  ]);
  expect(flowerDyeingUses(data, 99, items)).toEqual([]);
});
