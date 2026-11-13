import { expect, test } from "vite-plus/test";
import { createGameplayTagIndex, type GameplayTag } from "@loomix/schema/gameplay-tags";
import { createCollectionTagFilter } from "./tags";
import { flattenFilterOptions } from "./filter-types";

function tag(id: number, internalName: string, parentId: number | null = null): GameplayTag {
  return { id, internalName, parentId, enumName: null, displayName: internalName };
}

const tags = [
  tag(1, "颜色"),
  tag(2, "红色", 1),
  tag(3, "深红", 2),
  tag(4, "蓝色", 1),
  tag(5, "材质"),
  tag(6, "木制", 5),
  tag(7, "未使用分支"),
  { ...tag(8, "另一红色", 7), displayName: "红色" },
];
const records = [
  { id: 10, tagIds: [3, 6] },
  { id: 11, tagIds: [4] },
  { id: 12, tagIds: [2] },
  { id: 13, tagIds: [] },
];
const filter = createCollectionTagFilter(tags, createGameplayTagIndex(tags), records);

test("父标签包含任意深度后代及直接挂载记录，不混淆同名标签", () => {
  expect(records.filter((r) => filter.matches(r.id, ["1"], "and")).map((r) => r.id)).toEqual([
    10, 11, 12,
  ]);
  expect(records.filter((r) => filter.matches(r.id, ["2"], "and")).map((r) => r.id)).toEqual([
    10, 12,
  ]);
  expect(records.filter((r) => filter.matches(r.id, ["3"], "and")).map((r) => r.id)).toEqual([10]);
  expect(records.filter((r) => filter.matches(r.id, ["8"], "or"))).toEqual([]);
});

test("AND 与 OR 组合全部标签条件，空选择不限制结果", () => {
  for (const mode of ["and", "or"] as const)
    expect(records.filter((r) => filter.matches(r.id, [], mode))).toEqual(records);
  expect(records.filter((r) => filter.matches(r.id, ["4", "6"], "and"))).toEqual([]);
  expect(records.filter((r) => filter.matches(r.id, ["4", "6"], "or")).map((r) => r.id)).toEqual([
    10, 11,
  ]);
  expect(filter.matches(10, ["1", "2", "3", "6"], "and")).toBe(true);
  expect(records.filter((r) => filter.matches(r.id, ["2", "4"], "and"))).toEqual([]);
  expect(records.filter((r) => filter.matches(r.id, ["2", "4"], "or")).map((r) => r.id)).toEqual([
    10, 11, 12,
  ]);
  expect(filter.matches(13, ["1"], "or")).toBe(false);
  expect(filter.matches(10, ["999"], "or")).toBe(false);
  expect(filter.matches(10, ["999", "6"], "and")).toBe(false);
  expect(filter.matches(10, ["999", "6"], "or")).toBe(true);
});

test("树裁剪无记录分支并显示公开路径，不可用标签仅在已选时展示", () => {
  const options = flattenFilterOptions(filter.options(["999"]));
  expect(options.map((option) => option.value)).toEqual(["1", "2", "3", "4", "5", "6", "999"]);
  expect(options.find((option) => option.value === "3")?.chipLabel).toBe(
    "标签：颜色 / 红色 / 深红",
  );
  expect(options.find((option) => option.value === "999")).toMatchObject({
    label: "不可用标签（999）",
    disabled: true,
  });
  expect(flattenFilterOptions(filter.options())).toHaveLength(6);
});

test("普通标签同时要求公开分支、显示名及自身或后代的收录物品", () => {
  const values = [
    tag(1, "食物"),
    { ...tag(2, "食品分类", 1), displayName: null },
    tag(3, "甜点", 2),
    tag(4, "容器类型", 1),
    tag(5, "容器_玻璃杯", 4),
    { ...tag(6, "主食", 2), displayName: null },
    tag(7, "未收录菜品", 2),
  ];
  const result = createCollectionTagFilter(values, createGameplayTagIndex(values), [
    { id: 10, tagIds: [3, 5, 6] },
  ]);
  const options = flattenFilterOptions(result.options());
  expect(options).toMatchObject([
    { label: "菜品类型", selectable: false },
    { value: "3", label: "甜点", chipLabel: "标签：菜品类型 / 甜点", count: 1 },
  ]);
  for (const id of ["1", "2", "4", "5", "6", "7"])
    expect(result.matches(10, [id], "and")).toBe(false);
  expect(result.matches(10, ["3"], "and")).toBe(true);
});

test("隐藏中间节点提升后代，匹配仍沿原始树继承且每件物品只计数一次", () => {
  const values = [
    tag(1, "家具"),
    { ...tag(2, "内部中间节点", 1), displayName: null },
    tag(3, "书桌", 2),
    tag(4, "另一分支"),
    { ...tag(5, "另一书桌", 4), displayName: "书桌" },
  ];
  const result = createCollectionTagFilter(values, createGameplayTagIndex(values), [
    { id: 10, tagIds: [1, 2, 3] },
    { id: 11, tagIds: [2] },
    { id: 12, tagIds: [5] },
  ]);
  expect(result.options()).toMatchObject([
    {
      value: "1",
      count: 2,
      children: [{ value: "3", count: 1, chipLabel: "标签：家具 / 书桌" }],
    },
  ]);
  expect(result.matches(11, ["1"], "and")).toBe(true);
  expect(result.matches(10, ["2"], "and")).toBe(false);
  expect(result.matches(12, ["3"], "and")).toBe(false);
  const unavailable = flattenFilterOptions(result.options(["2", "5", "999", "2"]));
  expect(unavailable.slice(-3).map((option) => option.label)).toEqual([
    "不可用标签（2）",
    "不可用标签（5）",
    "不可用标签（999）",
  ]);
  expect(JSON.stringify(unavailable)).not.toContain("内部中间节点");
  expect(result.matches(10, ["2", "3"], "and")).toBe(false);
  expect(result.matches(10, ["2", "3"], "or")).toBe(true);
});

test("偏好标签绕过普通限制，保留零匹配但不开放内部祖先、兄弟或后代", () => {
  const values = [
    tag(1, "烹饪原料"),
    { ...tag(2, "含水果父级", 1), displayName: null },
    { ...tag(3, "含水果", 2), displayName: null },
    tag(4, "内部兄弟", 2),
    tag(5, "内部后代", 3),
    tag(6, "服装"),
    { ...tag(7, "拖鞋", 6), displayName: null },
    { ...tag(8, "肥料袋"), displayName: "肥料" },
  ];
  const result = createCollectionTagFilter(
    values,
    createGameplayTagIndex(values),
    [{ id: 10, tagIds: [5] }],
    [3, 7, 8, 3],
  );
  const options = flattenFilterOptions(result.options());
  expect(options.filter((option) => option.selectable !== false)).toMatchObject([
    { value: "7", label: "拖鞋（暂无收录物品）", count: 0, chipLabel: "标签：服装 / 拖鞋" },
    { value: "3", label: "含水果", count: 1, chipLabel: "标签：其他偏好 / 含水果" },
    { value: "8", label: "肥料（暂无收录物品）", count: 0 },
  ]);
  expect(options.every((option) => !option.disabled)).toBe(true);
  expect(result.matches(10, ["3"], "and")).toBe(true);
  expect(result.matches(10, ["7"], "and")).toBe(false);
  expect(result.matches(10, ["5"], "and")).toBe(false);
  expect(JSON.stringify(options)).not.toContain("含水果父级");
});

test("空目录裁剪所有普通分支，偏好引用缺失时拒绝静默遗漏", () => {
  expect(createCollectionTagFilter(tags, createGameplayTagIndex(tags), []).options()).toEqual([]);
  expect(() => createCollectionTagFilter(tags, createGameplayTagIndex(tags), [], [999])).toThrow(
    "Unknown GameplayTag 999",
  );
});
