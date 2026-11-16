import { expect, test } from "vite-plus/test";
import { checkIngredientTagFilter } from "./ingredients.ts";
import { ingredientFixture } from "../fixture.ts";
import type { TagFilterFixture } from "../fixture.ts";

function byName(fixture: TagFilterFixture, name: string) {
  const tag = fixture.tags.find((item) => item.internalName === name);
  if (!tag) throw new Error(`缺少测试标签 ${name}`);
  return tag;
}

function firstChild(fixture: TagFilterFixture, parentId: number) {
  const child = fixture.tags.find((item) => item.parentId === parentId);
  if (!child) throw new Error(`缺少测试子级 ${parentId}`);
  return child;
}

test("当前策略通过食材分组检查", () => {
  const result = checkIngredientTagFilter(ingredientFixture());
  expect(result.issues).toEqual([]);
  expect(result.summary).toContain("3 组");
  expect(result.summary).toContain("6 种食材");
});

test("报告缺失的食材根", () => {
  const result = checkIngredientTagFilter({ tags: [], records: [] });
  expect(result.issues).toEqual([{ path: "gameplay-tags", message: "食材根不存在" }]);
});

test("报告分组根不是食材的直接子级", () => {
  const fixture = ingredientFixture();
  const moved = byName(fixture, "食材_荤菜");
  moved.parentId = byName(fixture, "食材_素菜").id;
  const result = checkIngredientTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "分类",
    message: "食材分组根不是食材的直接子级：食材_荤菜",
  });
});

test("报告容器分组不是食材的直接子级", () => {
  const fixture = ingredientFixture();
  const moved = byName(fixture, "食材_颜色");
  moved.parentId = byName(fixture, "食材_素菜").id;
  const result = checkIngredientTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "颜色",
    message: "食材分组根不是食材的直接子级：食材_颜色",
  });
});

test("报告没有子级的分组", () => {
  const fixture = ingredientFixture();
  const container = byName(fixture, "食材_颜色");
  const child = firstChild(fixture, container.id);
  fixture.tags = fixture.tags.filter((tag) => tag.id !== child.id);
  fixture.records = fixture.records.filter((record) => !record.tagIds.includes(child.id));
  const result = checkIngredientTagFilter(fixture);
  expect(result.issues).toContainEqual({ path: "颜色", message: "食材分组没有子级：颜色" });
  expect(result.issues).toContainEqual({ path: "颜色", message: "食材分组没有可见选项：颜色" });
});

test("报告不在食材子树内的排除标签", () => {
  const fixture = ingredientFixture();
  byName(fixture, "食材_不宜使用").parentId = null;
  const result = checkIngredientTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "食材排除标签",
    message: "食材排除标签不在食材子树内：食材_不宜使用",
  });
});

test("报告未归属分组的一级标签", () => {
  const fixture = ingredientFixture();
  const nextId = Math.max(...fixture.tags.map((tag) => tag.id)) + 1;
  fixture.tags.push({
    id: nextId,
    internalName: "食材_新增",
    parentId: byName(fixture, "食材").id,
    displayName: "新增",
  });
  const result = checkIngredientTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "gameplay-tags:食材",
    message: "食材一级标签未归属分组：食材_新增（新增）",
  });
});

test("报告没有可见选项的分组", () => {
  const fixture = ingredientFixture();
  const container = byName(fixture, "食材_颜色");
  const child = firstChild(fixture, container.id);
  fixture.records = fixture.records.filter((record) => !record.tagIds.includes(child.id));
  const result = checkIngredientTagFilter(fixture);
  expect(result.issues).toContainEqual({
    path: "颜色",
    message: "食材分组没有可见选项：颜色",
  });
});
