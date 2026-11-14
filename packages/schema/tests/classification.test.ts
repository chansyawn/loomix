import { expect, test } from "vite-plus/test";
import { RecordSchema, mergeRecordTagIds } from "../src/catalog/index.ts";
import { validateCatalog } from "../src/catalog/validate.ts";
import { validateDataset } from "../src/dataset/index.ts";
import { datasetFixture, recordMetadata } from "./fixture.ts";

function fixture() {
  const dataset = datasetFixture(
    { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
    { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
  );
  dataset.gameplayTags.tags = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    internalName: `标签${index + 1}`,
    displayName: null,
    enumName: null,
    parentId: null,
  }));
  dataset.catalog.clientTypes = [{ id: 9, name: null, tagIds: [4, 5] }];
  const metadata = recordMetadata();
  metadata.tagFields.type = [2, 1];
  metadata.tagFields.foodMaterials = [3];
  metadata.tagFields.npcFurnitureCategory = [2, 4];
  const record = RecordSchema.parse({
    ...metadata,
    id: 1,
    name: "物品",
    image: null,
    quality: null,
    description: null,
    kind: "material",
    client: { type: 9, idType: 999, subtype: 6, subtypeName: "原始名称" },
    displayCategory: null,
    trade: null,
    acquisition: null,
    tagIds: mergeRecordTagIds(metadata.tagFields, [4, 5]),
  });
  dataset.catalog.records.push(record);
  return { dataset, record };
}

test("十二来源后追加类型标签，稳定去重且不将 idType 当作外键", () => {
  const { dataset, record } = fixture();
  expect(record.tagIds).toEqual([2, 1, 3, 4, 5]);
  expect(record.tagFields.npcFurnitureCategory).toEqual([2, 4]);
  expect(validateDataset(dataset)).toEqual([]);
});

test("目录拒绝重复类型、来源内重复、缺失类型和错误顺序或缺失的合并标签", () => {
  const { dataset, record } = fixture();
  for (const tagIds of [
    [1, 2, 3, 4, 5],
    [2, 1, 3, 4],
    [2, 1, 3, 4, 5, 5],
  ]) {
    record.tagIds = tagIds;
    expect(validateCatalog(dataset.catalog).some((issue) => issue.path.includes("tagIds"))).toBe(
      true,
    );
  }
  record.tagFields.color = [1, 1];
  dataset.catalog.clientTypes.push({ id: 9, name: null, tagIds: [4, 4] });
  record.client.type = 999;
  const paths = validateCatalog(dataset.catalog).map((issue) => issue.path.join("."));
  expect(paths).toContain("catalog.clientTypes.1");
  expect(paths).toContain("catalog.clientTypes.1.tagIds.1");
  expect(paths).toContain("catalog.records.0.client.type");
  expect(paths).toContain("catalog.records.0.tagFields.color.1");
});

test("每组来源、类型标签与合并集合都必须引用已有 GameplayTag", () => {
  const { dataset, record } = fixture();
  record.tagFields.foodMaterials = [999];
  dataset.catalog.clientTypes[0]!.tagIds = [888];
  record.tagIds = [777];
  const issues = validateDataset(dataset);
  for (const path of [
    "catalog.clientTypes.0.tagIds",
    "catalog.records.0.tagFields.foodMaterials",
    "catalog.records.0.tagIds",
  ])
    expect(
      issues.some(
        (issue) => issue.path.join(".") === path && issue.message.startsWith("Unknown tag"),
      ),
    ).toBe(true);
});

test("v8 拒绝旧字段、缺失来源、空标签组和非法客户端标量", () => {
  const { record } = fixture();
  for (const fields of [
    { type: "material" },
    { subcategory: null },
    { furnitureType: null },
    { clientType: 9 },
    { clientSecondaryType: 62 },
    { tagFields: { ...record.tagFields, foodMaterials: null } },
    { tagFields: { type: [] } },
    ...[-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null].map((subtype) => ({
      client: { ...record.client, subtype },
    })),
    { client: { ...record.client, subtypeName: "" } },
  ])
    expect(() => RecordSchema.parse({ ...record, ...fields })).toThrow();
});
