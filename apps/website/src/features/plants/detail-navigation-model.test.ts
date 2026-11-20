import { expect, test } from "vite-plus/test";
import { plantDetailNavigation } from "./detail-navigation-model";
import {
  plantItemFixture,
  plantSeedFixture,
  plantSeriesFixture,
  plantsDataFixture,
} from "./fixture";
import type { PlantItem, PlantsData } from "./model";

const items = [1, 2, 3].map((id) => plantItemFixture({ id }));
const seeds = [
  plantSeedFixture({ id: 20, plantIds: [2] }),
  plantSeedFixture({ id: 10, plantIds: [1] }),
];
const series = [plantSeriesFixture({ id: 100, plantIds: [2, 1] })];
const data = { items, seeds, series };

function groupIds(currentId: number, input = data) {
  return plantDetailNavigation(navigationData(input), currentId).groups.map((group) =>
    group.entries.map((entry) => entry.id),
  );
}

function navigationData(input: typeof data): PlantsData {
  const sourceTreesByItemId = new Map<number, PlantItem[]>();
  for (const tree of input.items) {
    for (const id of new Set(tree.treeDrops?.map((drop) => drop.itemId))) {
      sourceTreesByItemId.set(id, [...(sourceTreesByItemId.get(id) ?? []), tree]);
    }
  }
  return { ...plantsDataFixture(input), sourceTreesByItemId };
}

test("系列、成员和种子共享稳定顺序，导航不依赖当前物品排序", () => {
  for (const id of [100, 1, 2, 10, 20]) expect(groupIds(id)).toEqual([[100, 20, 10, 2, 1]]);
  expect(plantDetailNavigation(navigationData(data), 10).groups[0].entries[0]).toMatchObject({
    id: 100,
    label: "系列概览",
  });
});

test("没有系列时按种子直接关联植物导航，不依赖作物分类", () => {
  const input = { items, seeds: [plantSeedFixture({ id: 10, plantIds: [2, 1] })], series: [] };
  for (const id of [10, 1, 2]) expect(groupIds(id, input)).toEqual([[10, 2, 1]]);
  expect(groupIds(3, input)).toEqual([]);
});

test("多个来源种子分别保留生长分组", () => {
  const input = {
    items,
    seeds: [
      plantSeedFixture({ id: 10, plantIds: [1, 2] }),
      plantSeedFixture({ id: 20, plantIds: [1, 3] }),
    ],
    series: [],
  };
  expect(groupIds(1, input)).toEqual([
    [10, 1, 2],
    [20, 1, 3],
  ]);
});

test("多个系列按目录顺序分组，不递归扩展到间接关联系列", () => {
  const input = {
    items,
    seeds: [plantSeedFixture({ id: 10, plantIds: [1] })],
    series: [
      plantSeriesFixture({ id: 200, plantIds: [1, 2] }),
      plantSeriesFixture({ id: 100, plantIds: [1, 3] }),
      plantSeriesFixture({ id: 300, plantIds: [2] }),
    ],
  };
  expect(groupIds(1, input)).toEqual([
    [200, 10, 1, 2],
    [100, 10, 1, 3],
  ]);
  expect(groupIds(10, input)).toEqual(groupIds(1, input));
  expect(groupIds(200, input)).toEqual([[200, 10, 1, 2]]);
});

test("跨系列种子覆盖多个系列，未归组的植物通过生长分组补齐", () => {
  const input = {
    items,
    seeds: [plantSeedFixture({ id: 10, plantIds: [3, 2, 1] })],
    series: [
      plantSeriesFixture({ id: 100, plantIds: [1] }),
      plantSeriesFixture({ id: 200, plantIds: [2] }),
    ],
  };
  expect(groupIds(10, input)).toEqual([
    [100, 10, 1],
    [200, 10, 2],
    [10, 3, 2, 1],
  ]);
  expect(groupIds(3, input)).toEqual([[10, 3, 2, 1]]);
  expect(
    groupIds(10, {
      ...input,
      series: [...input.series, plantSeriesFixture({ id: 300, plantIds: [3] })],
    }),
  ).toEqual([
    [100, 10, 1],
    [200, 10, 2],
    [300, 10, 3],
  ]);
});

test("每组去重并忽略缺失正式植物，不能生成悬空详情链接", () => {
  const input = {
    items,
    seeds: [plantSeedFixture({ id: 10, plantIds: [1, 1, 99] })],
    series: [plantSeriesFixture({ id: 100, plantIds: [1, 1, 99] })],
  };
  expect(groupIds(100, input)).toEqual([[100, 10, 1]]);
  expect(groupIds(10, { ...input, series: [] })).toEqual([[10, 1]]);
});

test("未知成员保留提示，空系列与孤立植物隐藏无目标导航", () => {
  const input = {
    items,
    seeds: [],
    series: [
      plantSeriesFixture({ id: 100, plantIds: null }),
      plantSeriesFixture({ id: 200, plantIds: [] }),
    ],
  };
  const navigationInput = navigationData(input);
  expect(plantDetailNavigation(navigationInput, 1)).toEqual({
    groups: [],
    hasUnconfirmedMembership: true,
  });
  for (const id of [100, 200, 999])
    expect(plantDetailNavigation(navigationInput, id)).toEqual({
      groups: [],
      hasUnconfirmedMembership: false,
    });
});

test("种子、果树和果实共享顶部导航，忽略砍伐掉落", () => {
  const input = {
    items: [
      plantItemFixture({
        id: 1,
        treeDrops: [
          { itemId: 2, source: "fruit" },
          { itemId: 3, source: "felling" },
          { itemId: 2, source: "fruit" },
        ],
      }),
      plantItemFixture({ id: 2 }),
      plantItemFixture({ id: 3 }),
    ],
    seeds: [plantSeedFixture({ id: 10, plantIds: [1] })],
    series: [],
  };
  for (const id of [10, 1, 2]) expect(groupIds(id, input)).toEqual([[10, 1, 2]]);
  expect(groupIds(3, input)).toEqual([]);
  expect(groupIds(1, { ...input, seeds: [] })).toEqual([[1, 2]]);
  expect(groupIds(2, { ...input, seeds: [] })).toEqual([[1, 2]]);
});

test("共享果实可切回每个来源树的分组，系列分组只展示一次", () => {
  const sharedFruit = { itemId: 4, source: "fruit" } as const;
  const input = {
    items: [
      plantItemFixture({ id: 1, treeDrops: [sharedFruit] }),
      plantItemFixture({ id: 2, treeDrops: [sharedFruit] }),
      plantItemFixture({ id: 3, treeDrops: [sharedFruit, { itemId: 5, source: "fruit" }] }),
      plantItemFixture({ id: 4 }),
      plantItemFixture({ id: 5 }),
    ],
    seeds: [plantSeedFixture({ id: 10 }), plantSeedFixture({ id: 20, plantIds: [3] })],
    series: [plantSeriesFixture({ id: 100, plantIds: [2, 1] })],
  };
  for (const id of [100, 10, 1, 2]) expect(groupIds(id, input)).toEqual([[100, 10, 2, 1, 4]]);
  expect(groupIds(4, input)).toEqual([
    [100, 10, 2, 1, 4],
    [20, 3, 4, 5],
  ]);
  expect(groupIds(5, input)).toEqual([[20, 3, 4, 5]]);
});

test("缺失或仅供引用的果实无法生成详情链接", () => {
  const input = navigationData({
    items: [
      plantItemFixture({
        id: 1,
        treeDrops: [
          { itemId: 98, source: "fruit" },
          { itemId: 99, source: "fruit" },
        ],
      }),
    ],
    seeds: [],
    series: [],
  });
  const itemRefs = new Map(input.itemRefs);
  itemRefs.set(99, {
    id: 99,
    name: "仅供引用的果实",
    image: null,
    description: null,
    quality: null,
    catalogCategory: "miscellaneous",
    browsable: false,
  });
  expect(plantDetailNavigation({ ...input, itemRefs }, 1).groups).toEqual([]);
});
