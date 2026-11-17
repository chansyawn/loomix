import { expect, test } from "vite-plus/test";
import { createGameplayTagIndex, type GameplayTag } from "@loomix/schema/gameplay-tags";
import { createCollectionTagFilter } from "./tags";
import { flattenFilterOptions } from "./filter-types";

function tag(
  id: number,
  internalName: string,
  parentId: number | null = null,
  displayName: string | null = null,
): GameplayTag {
  return { id, internalName, parentId, displayName };
}

const tags = [
  tag(1, "颜色"),
  tag(2, "红色", 1),
  tag(3, "深红", 2),
  tag(4, "蓝色", 1),
  tag(5, "材质"),
  tag(6, "木制", 5),
  tag(7, "未使用分支"),
  tag(8, "另一红色", 7, "红色"),
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

test("无策略时保留完整标签树并单独展示未知标签", () => {
  const options = flattenFilterOptions(filter.options(["999"]));
  expect(options.map((option) => option.value)).toHaveLength(tags.length + 1);
  expect(options.find((option) => option.value === "3")?.chipLabel).toBe(
    "标签：颜色 / 红色 / 深红",
  );
  expect(options.find((option) => option.value === "8")?.chipLabel).toBe("标签：未使用分支 / 红色");
  expect(options.find((option) => option.value === "999")?.label).toBe("未知标签（999）");
  expect(options.every((option) => !option.disabled)).toBe(true);
  expect(flattenFilterOptions(filter.options())).toHaveLength(tags.length);
});

test("策略只保留白名单根、剪除未引用分支并隐藏空根", () => {
  const policyTags = [
    tag(1, "颜色"),
    tag(2, "食材_红色", 1),
    tag(3, "未使用", 1),
    tag(4, "材质"),
    tag(5, "容器_杯", 4),
    tag(6, "空根"),
  ];
  const scoped = createCollectionTagFilter(
    policyTags,
    createGameplayTagIndex(policyTags),
    [
      { id: 20, tagIds: [2, 5] },
      { id: 21, tagIds: [] },
    ],
    {
      rootNames: ["颜色", "材质", "空根"],
      labelOverrides: { 食材_红色: "红色" },
      labelPrefixes: ["食材_", "容器_"],
    },
  );

  const options = flattenFilterOptions(scoped.options());
  expect(options.map((option) => option.value)).toEqual(["1", "2", "4", "5"]);
  expect(options.find((option) => option.value === "2")?.chipLabel).toBe("标签：颜色 / 红色");
  expect(options.find((option) => option.value === "5")).toMatchObject({
    label: "杯",
    chipLabel: "标签：材质 / 杯",
  });
  expect(scoped.acceptSelection(["1", "2", "3", "5", "999"])).toEqual(["1", "2", "5"]);
});

test("策略下仍按祖先闭包匹配记录", () => {
  const policyTags = [tag(1, "颜色"), tag(2, "食材_红色", 1)];
  const scoped = createCollectionTagFilter(
    policyTags,
    createGameplayTagIndex(policyTags),
    [{ id: 30, tagIds: [2] }],
    { rootNames: ["颜色"], labelPrefixes: ["食材_"] },
  );
  expect(scoped.matches(30, ["1"], "and")).toBe(true);
  expect(scoped.matches(30, ["2"], "and")).toBe(true);
  expect(scoped.acceptSelection(["1"])).toEqual(["1"]);
});
