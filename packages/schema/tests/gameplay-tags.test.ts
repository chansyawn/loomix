import { expect, test } from "vite-plus/test";
import { createGameplayTagIndex, parseGameplayTags, tagLabel } from "../src/gameplay-tags/index.ts";
import type { GameplayTag } from "../src/gameplay-tags/index.ts";
import { createRecordTagResolver } from "../src/catalog/index.ts";
import { parseDataset, validateDataset } from "../src/dataset/index.ts";
import { datasetFixture, dish, reference } from "./fixture.ts";

const tag = (id: number, internalName: string, parentId: number | null = null): GameplayTag => ({
  id,
  internalName,
  parentId,
  displayName: null,
});
const tags = [
  tag(1, "颜色"),
  tag(2, "红色", 1),
  tag(3, "深红", 2),
  tag(4, "材质"),
  tag(5, "木质", 4),
];

test("统一索引支持多根树与包含自身的继承查询", () => {
  const index = createGameplayTagIndex(tags);
  expect(index.findByName("深红")?.id).toBe(3);
  expect(index.ancestors(3).map((value) => value.id)).toEqual([3, 2, 1]);
  expect(index.subtree(1).map((value) => value.id)).toEqual([1, 2, 3]);
  expect(index.select([5, 3, 2], 1).map((value) => value.id)).toEqual([3, 2]);
  expect(() => index.get(999)).toThrow("Unknown GameplayTag");
  expect(tagLabel(tags[1]!)).toBe("红色");
  expect(tagLabel({ ...tags[1]!, displayName: "红" })).toBe("红");
});

test.each([
  [tags[0]!, tags[0]!],
  [tags[0]!, tag(2, "颜色")],
  [tag(1, "颜色", 999)],
  [tag(1, "颜色", 2), tag(2, "红色", 1)],
])("标签文档拒绝重复身份、缺失父级及循环 %#", (...values) => {
  expect(() => parseGameplayTags({ tags: values })).toThrow();
});

test("目录属性由直接标签的子树派生，并保留显示顺序", () => {
  const resolve = createRecordTagResolver(createGameplayTagIndex(tags));
  expect(resolve({ tagIds: [5, 3, 2] }, "colors").map((value) => value.id)).toEqual([3, 2]);
  expect(resolve({ tagIds: [5, 3, 2] }, "materials").map((value) => value.id)).toEqual([5]);
});

test("物品与食谱引用同一标签身份，食谱受食材子树约束", () => {
  const dataset = datasetFixture();
  dataset.gameplayTags.tags = [tag(10, "食材"), tag(11, "食材_水果", 10), tag(20, "颜色")];
  const meal = {
    ...dish(2),
    tagIds: [11],
    cooking: {
      difficulty: null,
      unlockCondition: null,
      cookware: null,
      tastes: null,
      slots: [{ expression: { kind: "tag" as const, tagId: 11 }, itemIds: [1] }],
    },
  };
  dataset.catalog.items.push(reference(1), meal);
  expect(parseDataset(dataset).catalog.items[1]).toEqual(meal);
  meal.cooking.slots[0]!.expression = { kind: "tag", tagId: 20 };
  expect(validateDataset(dataset).map((issue) => issue.message)).toContain(
    "Unknown ingredient tag 20",
  );
  meal.tagIds = [999];
  expect(validateDataset(dataset).map((issue) => issue.message)).toContain("Unknown tag 999");
});
