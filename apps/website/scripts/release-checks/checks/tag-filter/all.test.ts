import { expect, test } from "vite-plus/test";
import { ALL_TAG_FILTER_POLICY } from "../../../../src/features/all/tag-filter-policy.ts";
import { checkAllTagFilter } from "./all.ts";
import { allFilterFixture } from "../fixture.ts";
import type { TagFilterFixture } from "../fixture.ts";

function rootOf(fixture: TagFilterFixture, name: string) {
  const root = fixture.tags.find((tag) => tag.parentId === null && tag.internalName === name);
  if (!root) throw new Error(`缺少测试根 ${name}`);
  return root;
}

function childOf(fixture: TagFilterFixture, parentId: number) {
  const child = fixture.tags.find((tag) => tag.parentId === parentId);
  if (!child) throw new Error(`缺少测试子级 ${parentId}`);
  return child;
}

test("当前策略通过白名单根与可见性检查", () => {
  const result = checkAllTagFilter(allFilterFixture());
  expect(result.issues).toEqual([]);
  expect(result.summary).toContain("13 个根");
});

test("报告缺失的白名单根", () => {
  const fixture = allFilterFixture();
  const root = rootOf(fixture, "颜色");
  const child = childOf(fixture, root.id);
  fixture.tags = fixture.tags.filter((tag) => tag.id !== root.id && tag.id !== child.id);
  fixture.records = fixture.records.filter((record) => !record.tagIds.includes(child.id));
  const result = checkAllTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "gameplay-tags",
    message: "白名单根不存在：颜色",
  });
});

test("报告没有可见标签的白名单根", () => {
  const fixture = allFilterFixture();
  const root = rootOf(fixture, "颜色");
  const child = childOf(fixture, root.id);
  fixture.records = fixture.records.filter((record) => !record.tagIds.includes(child.id));
  const result = checkAllTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "颜色",
    message: "白名单根当前没有可见标签",
  });
});

test("报告可见标签中的内部命名", () => {
  const fixture = allFilterFixture();
  const ingredientRoot = rootOf(fixture, "食材");
  const child = childOf(fixture, ingredientRoot.id);
  child.displayName = "坏_标签";
  const result = checkAllTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: `标签 ${child.id}`,
    message: "可见标签仍含内部命名：坏_标签",
  });
  expect(ALL_TAG_FILTER_POLICY.rootNames).toContain("食材");
});

test("报告同级重名", () => {
  const fixture = allFilterFixture();
  const root = rootOf(fixture, "颜色");
  const child = childOf(fixture, root.id);
  const nextId = Math.max(...fixture.tags.map((tag) => tag.id)) + 1;
  fixture.tags.push({
    id: nextId,
    internalName: "颜色_重复子项",
    parentId: root.id,
    displayName: child.displayName,
  });
  fixture.records.push({ id: nextId, tagIds: [nextId] });
  const result = checkAllTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "颜色",
    message: `同级重名：${child.displayName}`,
  });
});
