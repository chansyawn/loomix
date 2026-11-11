import { expect, test } from "vite-plus/test";
import { createGameplayTagIndex, parseGameplayTags, tagLabel } from "../src/gameplay-tags/index.ts";
import type { GameplayTag } from "../src/gameplay-tags/index.ts";
import { createRecordTagResolver } from "../src/catalog/index.ts";
import { emptyDataset, parseDataset, validateDataset } from "../src/dataset/index.ts";
import { recordMetadata } from "./fixture.ts";

const context = { formatVersion: 6, snapshotId: "a".repeat(64), locale: "zh-CN" } as const;
const tag = (id: number, internalName: string, parentId: number | null = null): GameplayTag => ({
  id,
  internalName,
  parentId,
  enumName: "Shared",
  displayName: null,
});
const tags = [
  tag(1, "颜色"),
  tag(2, "红色", 1),
  tag(3, "深红", 2),
  tag(4, "材质"),
  tag(5, "木质", 4),
];

test("统一索引支持多根树、枚举重名和包含自身的继承查询", () => {
  const index = createGameplayTagIndex(tags);
  expect(index.findByName("深红")?.id).toBe(3);
  expect(index.findByEnumName("Shared")).toHaveLength(5);
  expect(index.findByEnumName("missing")).toEqual([]);
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
  expect(() => parseGameplayTags({ ...context, kind: "gameplay-tags", tags: values })).toThrow();
});

test("目录属性由直接标签的子树派生，并保留显示顺序", () => {
  const resolve = createRecordTagResolver(createGameplayTagIndex(tags));
  expect(resolve({ tagIds: [5, 3, 2] }, "colors").map((value) => value.id)).toEqual([3, 2]);
  expect(resolve({ tagIds: [5, 3, 2] }, "materials").map((value) => value.id)).toEqual([5]);
});

test("物品、偏好和食谱引用同一标签身份，食谱受食材子树约束", () => {
  const dataset = emptyDataset(context, {
    gameVersion: "test",
    dataRevision: 1,
    resourceRevision: 1,
    manifestId: "1",
  });
  dataset.gameplayTags.tags = [tag(10, "食材"), tag(11, "食材_水果", 10), tag(20, "颜色")];
  dataset.catalog.references.push({ id: 1, name: "苹果" });
  dataset.catalog.ingredientCategories = [
    { tagId: 10, itemIds: [1] },
    { tagId: 11, itemIds: [1] },
  ];
  dataset.catalog.records.push({
    ...recordMetadata(),
    id: 2,
    name: "菜肴",
    type: "dish",
    image: null,
    description: null,
    quality: null,
    subcategory: null,
    trade: null,
    acquisition: null,
    tagIds: [11],
    difficulty: null,
    cookware: null,
    effectsText: null,
    tastes: null,
    difficultyRequirement: null,
    effects: null,
    recipe: {
      slots: [
        {
          field: 20,
          rawExpression: "食材_水果",
          expression: { kind: "tag", tagId: 11 },
          itemIds: [1],
          quantity: null,
        },
      ],
    },
  });
  expect(parseDataset(dataset).catalog.records[0]!.tagIds).toEqual([11]);
  dataset.catalog.ingredientCategories[1]!.tagId = 20;
  const messages = validateDataset(dataset).map((issue) => issue.message);
  expect(messages).toContain("Invalid ingredient tag 20");
  expect(messages).toContain("Unknown ingredient category 11");
  dataset.catalog.records[0]!.tagIds = [999];
  expect(validateDataset(dataset).map((issue) => issue.message)).toContain("Unknown tag 999");
});
