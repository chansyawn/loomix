import type { Assets } from "@loomix/schema/assets";
import type { Starsea } from "@loomix/schema/starsea";
import { expect, test } from "vite-plus/test";
import { addFixtureRecords, catalogFixture } from "../collection-fixture";
import { neighborFixture } from "../neighbors/fixture";
import { filterIslets } from "./search";
import { toStarseaDetail, toStarseaList } from "./view";

const illustration = { assetId: "islet", variant: "illustration" } as const;
const icon = { assetId: "radar", variant: "icon" } as const;
const assets: Assets = {
  images: [illustration, icon].map((ref) => {
    const sha256 = (ref === illustration ? "a" : "b").repeat(64);
    return { ...ref, file: `assets/${sha256}.webp`, sha256, bytes: 1, width: 10, height: 10 };
  }),
};

function starseaFixture(): Starsea {
  return {
    regions: [
      {
        id: 1,
        name: "禾夏H83区",
        galaxyName: "禾夏",
        unlockTip: null,
        mapImage: null,
        stationImage: null,
        explorationIslandIds: [125, 24],
        encounters: [
          { neighborId: 1, candidateIslandIds: [79, 125] },
          { neighborId: 2, candidateIslandIds: [79, 76] },
          { neighborId: 3, candidateIslandIds: null },
          { neighborId: 4, candidateIslandIds: [] },
        ],
      },
      {
        id: 2,
        name: "沐雪季·禾夏H84区",
        galaxyName: "禾夏",
        unlockTip: null,
        mapImage: null,
        stationImage: null,
        explorationIslandIds: [24],
        encounters: [{ neighborId: 1, candidateIslandIds: [79] }],
      },
    ],
    islands: [24, 76, 79, 125, 999].map((id) => ({
      id,
      name: `星屿 ${id}`,
      iconStyleId: 1,
      illustration: id === 125 ? illustration : null,
      displayedCreatureIds: id === 125 ? [12, 11] : null,
      displayedSpecialtyIds: id === 125 ? [] : null,
    })),
    iconStyles: [{ id: 1, name: "水域", icon }],
  };
}

test("星屿图片依次使用插画、雷达图标和占位", () => {
  const starsea = starseaFixture();
  expect(toStarseaList(starsea, assets).islets[0]).toMatchObject({
    image: assets.images[0].file,
    illustrated: true,
  });
  expect(toStarseaList(starsea, { images: [assets.images[1]] }).islets[0]).toMatchObject({
    image: assets.images[1].file,
    illustrated: false,
  });
  expect(toStarseaList(starsea, { images: [] }).islets[0].image).toBeNull();
});

test("星屿按区域与探索顺序排列，候选去重并保留可筛选的区域归属", () => {
  const list = toStarseaList(starseaFixture(), assets);
  expect(list.regions.map(({ id }) => id)).toEqual([1, 2]);
  expect(list.islets.map(({ id }) => id)).toEqual([125, 24, 79, 76]);
  expect(list.islets.filter(({ encounterOnly }) => encounterOnly).map(({ id }) => id)).toEqual([
    79, 76,
  ]);
  expect(filterIslets(list.islets, 1).map(({ id }) => id)).toEqual([125, 24, 79, 76]);
  expect(filterIslets(list.islets, 2).map(({ id }) => id)).toEqual([24, 79]);
});

test("详情按星屿关联物资与友邻，区分空配置和空条目", () => {
  const starsea = starseaFixture();
  const { database, mapping } = neighborFixture();
  const { catalog, gameplayTags } = catalogFixture();
  const relatedAssets = { images: [...assets.images, ...mapping.images] };
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 11, name: "同名鱼", kind: "creature", image: { assetId: "item", variant: "icon" } },
    { id: 12, name: "同名鱼", kind: "reference" },
  );
  const detail = toStarseaDetail(125, starsea, relatedAssets, catalog, database);
  expect(detail?.creatures).toEqual([
    { id: 12, name: "同名鱼", image: null, browsable: false },
    { id: 11, name: "同名鱼", image: `assets/${"5".repeat(64)}.webp`, browsable: true },
  ]);
  expect(detail?.specialties).toEqual([]);
  expect(detail?.encounterNeighbors).toEqual([
    { id: 1, name: "蛮蛮", image: `assets/${"c".repeat(64)}.webp` },
  ]);
  const missingRole = { images: relatedAssets.images.filter((image) => image.assetId !== "role") };
  const candidate = toStarseaDetail(79, starsea, missingRole, catalog, database);
  expect(candidate?.encounterNeighbors.map(({ id }) => id)).toEqual([1, 2]);
  expect(candidate?.encounterNeighbors.map(({ image }) => image)).toEqual([
    `assets/${"b".repeat(64)}.webp`,
    null,
  ]);
  expect(candidate?.regions.map(({ id }) => id)).toEqual([1, 2]);
  expect(candidate?.specialties).toBeNull();
  expect(toStarseaDetail(24, starsea, assets, catalog, database)?.encounterNeighbors).toEqual([]);
  expect(toStarseaDetail(999, starsea, assets, catalog, database)).toBeNull();
});

test("关联缺失时报告数据错误", () => {
  const starsea = starseaFixture();
  const { database, catalog } = neighborFixture();
  starsea.islands = [];
  expect(() => toStarseaDetail(125, starsea, assets, catalog, database)).toThrow("islet: 125");
});
