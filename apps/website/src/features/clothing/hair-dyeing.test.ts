import { createImageResolver } from "@loomix/schema/assets";
import { emptyHairDyeing, type HairDyeing } from "@loomix/schema/hair-dyeing";
import { expect, test } from "vite-plus/test";
import { hairstylePalette } from "./hair-dyeing";

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
  const [overall, highlights, ...rest] = hairstylePalette(paletteData, 1, image);
  expect(rest).toEqual([]);
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
  const regions = hairstylePalette(paletteData, 2, image);
  expect(regions.map(({ name }) => name)).toEqual(["整体发色"]);
  expect(regions[0].groups[0]).toMatchObject({
    image: null,
    swatches: [{ kind: "materialReplacement", image: null }],
  });
  expect(hairstylePalette(paletteData, 99, image)).toEqual([]);
});
