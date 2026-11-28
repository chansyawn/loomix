import { createImageResolver, type ImageIndex } from "@loomix/schema/assets";
import type { Starsea } from "@loomix/schema/starsea";
import { expect, test } from "vite-plus/test";
import { addFixtureRecords, catalogFixture } from "../omnidex-fixture";
import { neighborFixture } from "../neighbors/fixture";
import { filterIslets } from "./query";
import {
  itemExplorationHints,
  neighborEncounterIslets,
  toStarseaDetail,
  toStarseaList,
} from "./view";

const illustration = { assetId: "islet", variant: "illustration" } as const;
const icon = { assetId: "radar", variant: "icon" } as const;
const imageIndex: ImageIndex = {
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
        explorationIsletIds: [125, 24],
        encounters: [
          { neighborId: 1, candidateIsletIds: [79, 125] },
          { neighborId: 2, candidateIsletIds: [79, 76] },
          { neighborId: 3, candidateIsletIds: null },
          { neighborId: 4, candidateIsletIds: [] },
        ],
      },
      {
        id: 2,
        name: "沐雪季·禾夏H84区",
        galaxyName: "禾夏",
        unlockTip: null,
        mapImage: null,
        stationImage: null,
        explorationIsletIds: [24],
        encounters: [{ neighborId: 1, candidateIsletIds: [79] }],
      },
    ],
    islets: [24, 76, 79, 125, 999].map((id) => ({
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

test("探索提示反查保留各区域探索方式、生物和特产角色，并排除无区域归属的星屿", () => {
  const starsea = starseaFixture();
  for (const islet of starsea.islets) {
    if ([125, 79, 999].includes(islet.id)) islet.displayedSpecialtyIds = [12];
  }
  starsea.regions[1]!.encounters[0]!.candidateIsletIds!.push(125);
  const image = createImageResolver(imageIndex);
  expect(itemExplorationHints(starsea, 12, image)).toMatchObject([
    {
      id: 125,
      creature: true,
      specialty: true,
      regions: [
        { name: "禾夏H83区", exploration: true, encounter: true },
        { name: "沐雪季·禾夏H84区", exploration: false, encounter: true },
      ],
    },
    {
      id: 79,
      creature: false,
      specialty: true,
      regions: [
        { exploration: false, encounter: true },
        { exploration: false, encounter: true },
      ],
    },
  ]);
  expect(itemExplorationHints(starsea, 99, image)).toEqual([]);
});

test("星屿图片依次使用插画、雷达图标和占位", () => {
  const starsea = starseaFixture();
  expect(toStarseaList(starsea, imageIndex).islets[0]).toMatchObject({
    image: imageIndex.images[0].file,
    illustrated: true,
  });
  expect(toStarseaList(starsea, { images: [imageIndex.images[1]] }).islets[0]).toMatchObject({
    image: imageIndex.images[1].file,
    illustrated: false,
  });
  expect(toStarseaList(starsea, { images: [] }).islets[0].image).toBeNull();
});

test("友邻回链合并明确的候选星屿，保留各自区域并区分未知与空候选", () => {
  const starsea = starseaFixture();
  const related = (id: number) =>
    neighborEncounterIslets(starsea, id, createImageResolver(imageIndex));
  expect(related(1).islets).toMatchObject([
    { id: 125, regions: ["禾夏H83区"] },
    { id: 79, regions: ["禾夏H83区", "沐雪季·禾夏H84区"] },
  ]);
  expect(related(3)).toEqual({ islets: [], unconfirmedRegions: ["禾夏H83区"] });
  expect(related(4)).toEqual({ islets: [], unconfirmedRegions: [] });
  starsea.regions[1]!.encounters.push({ neighborId: 4, candidateIsletIds: [79] });
  expect(related(4).islets).toMatchObject([
    { id: 79, regions: ["沐雪季·禾夏H84区"], anchor: "encounters-2" },
  ]);
});

test("星屿按区域与探索顺序排列，候选去重并保留可筛选的区域归属", () => {
  const list = toStarseaList(starseaFixture(), imageIndex);
  expect(list.regions.map(({ id }) => id)).toEqual([1, 2]);
  expect(list.islets.map(({ id }) => id)).toEqual([125, 24, 79, 76]);
  expect(list.islets.filter(({ encounterOnly }) => encounterOnly).map(({ id }) => id)).toEqual([
    79, 76,
  ]);
  expect(filterIslets(list.islets, { q: "", region: 1 }).map(({ id }) => id)).toEqual([
    125, 24, 79, 76,
  ]);
  expect(filterIslets(list.islets, { q: "", region: 2 }).map(({ id }) => id)).toEqual([24, 79]);
});

test("星海按星屿名匹配，并与区域筛选取交集", () => {
  const { islets } = toStarseaList(starseaFixture(), imageIndex);
  for (const q of ["星屿 7", "xing yu 7", "xy7"]) {
    expect(filterIslets(islets, { q, region: null }).map(({ id }) => id)).toEqual([79, 76]);
    expect(filterIslets(islets, { q, region: 2 }).map(({ id }) => id)).toEqual([79]);
  }
  expect(filterIslets(islets, { q: "禾夏", region: 1 })).toEqual([]);
});

test("详情按星屿关联物资与友邻，区分空配置和空条目", () => {
  const starsea = starseaFixture();
  const { database, mapping } = neighborFixture();
  const { catalog, gameplayTags } = catalogFixture();
  const relatedImages = { images: [...imageIndex.images, ...mapping.images] };
  addFixtureRecords(
    catalog,
    gameplayTags,
    { id: 11, name: "同名鱼", kind: "creature", image: { assetId: "item", variant: "icon" } },
    { id: 12, name: "同名鱼", kind: "reference" },
    { id: 13, name: "创想卡", kind: "inspoCard" },
    { id: 14, name: "友邻服饰", kind: "neighborOutfit" },
  );
  starsea.islets.find(({ id }) => id === 125)!.displayedCreatureIds!.push(13, 14);
  const detail = toStarseaDetail(125, starsea, relatedImages, catalog, database);
  expect(detail?.creatures).toEqual([
    { id: 12, name: "同名鱼", image: null, browsable: false },
    { id: 11, name: "同名鱼", image: `assets/${"5".repeat(64)}.webp`, browsable: true },
    { id: 13, name: "创想卡", image: null, browsable: false },
    { id: 14, name: "友邻服饰", image: null, browsable: true },
  ]);
  expect(detail?.specialties).toEqual([]);
  expect(detail?.regions).toMatchObject([
    {
      exploration: true,
      neighbors: [{ id: 1, name: "蛮蛮", avatar: `assets/${"c".repeat(64)}.webp` }],
    },
  ]);
  const missingRole = { images: relatedImages.images.filter((image) => image.assetId !== "role") };
  const candidate = toStarseaDetail(79, starsea, missingRole, catalog, database);
  expect(candidate?.regions).toMatchObject([
    {
      id: 1,
      exploration: false,
      neighbors: [
        { id: 1, avatar: null },
        { id: 2, avatar: null },
      ],
    },
    { id: 2, exploration: false, neighbors: [{ id: 1, avatar: null }] },
  ]);
  expect(candidate?.specialties).toBeNull();
  expect(toStarseaDetail(24, starsea, imageIndex, catalog, database)?.regions).toMatchObject([
    { exploration: true, neighbors: [] },
    { exploration: true, neighbors: [] },
  ]);
  expect(toStarseaDetail(999, starsea, imageIndex, catalog, database)).toBeNull();
});

test("关联缺失时报告数据错误", () => {
  const starsea = starseaFixture();
  const { database, catalog } = neighborFixture();
  starsea.islets = [];
  expect(() => toStarseaDetail(125, starsea, imageIndex, catalog, database)).toThrow("islet: 125");
});
