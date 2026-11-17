import { expect, test } from "vite-plus/test";
import type { CatalogEntrySummary } from "../collection-view";
import { setDetailNavigation, type DetailNavigationModel } from "./detail-navigation-model";

function record(id: number, name: string): CatalogEntrySummary {
  return { id, name, image: null, description: null, quality: null };
}

const items = [record(1, "单品甲"), record(2, "单品乙"), record(3, "单品丙")];
const first = { ...record(100, "第一组"), componentIds: [2, 1] };
const second = { ...record(200, "第二组"), componentIds: [1, 3] };
const data = { items, sets: [first, second] };

function groupIds(model: DetailNavigationModel) {
  return model.groups.map((group) => group.entries.map((entry) => entry.id));
}

test.each(["套装", "套组"] as const)("%s 与成员共享导航顺序，概览使用对应名称", (label) => {
  const input = { items, sets: [first] };
  for (const id of [100, 2, 1]) {
    const navigation = setDetailNavigation(input, id, label);
    expect(groupIds(navigation)).toEqual([[100, 2, 1]]);
    expect(navigation.groups[0].entries[0]).toMatchObject({
      id: 100,
      label: `${label}概览`,
    });
  }
});

test("单品属于多个组时分组保留，概览仅展示本组，不扩展间接关系", () => {
  const input = { ...data, sets: [...data.sets, { ...first, id: 300, componentIds: [2] }] };
  expect(groupIds(setDetailNavigation(input, 1, "套装"))).toEqual([
    [100, 2, 1],
    [200, 1, 3],
  ]);
  expect(groupIds(setDetailNavigation(input, 100, "套装"))).toEqual([[100, 2, 1]]);
});

test("忽略缺失正式成员并按编号去重，保留来源顺序", () => {
  const input = { items, sets: [{ ...first, componentIds: [2, 99, 1, 2] }] };
  expect(groupIds(setDetailNavigation(input, 100, "套组"))).toEqual([[100, 2, 1]]);
});

test("未知成员仅对单品提供提示，空组和无归属单品不生成切换项", () => {
  const input = {
    items,
    sets: [
      { ...first, componentIds: null },
      { ...second, componentIds: [] },
    ],
  };
  expect(setDetailNavigation(input, 1, "套组")).toEqual({
    groups: [],
    notice: "其他套组的成员关系未确认",
  });
  for (const id of [100, 200]) expect(groupIds(setDetailNavigation(input, id, "套组"))).toEqual([]);
  expect(setDetailNavigation(data, 999, "套装")).toEqual({ groups: [] });
  expect(groupIds(setDetailNavigation({ items, sets: [] }, 1, "套装"))).toEqual([]);
});

test("单成员组保留概览与成员两个入口", () => {
  const input = { items, sets: [{ ...first, componentIds: [1] }] };
  expect(groupIds(setDetailNavigation(input, 1, "套组"))).toEqual([[100, 1]]);
});
