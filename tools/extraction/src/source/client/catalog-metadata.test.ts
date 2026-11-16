import { expect, test } from "vite-plus/test";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { createFixture } from "../../extraction/neighbors/fixtures/tables.ts";
import type { FixtureRows } from "../../extraction/neighbors/fixtures/tables.ts";
import { TAG_SOURCE_FIELD_NAMES, readCatalogMetadata } from "./catalog-metadata.ts";

const tags = createGameplayTagIndex(
  Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    internalName: `标签${index + 1}`,
    displayName: null,
    parentId: index === 14 ? 14 : null,
  })),
);
const type = (id: number, typetag: string | null = null): FixtureRows[number][number] => [
  id,
  `类型${id}`,
  ...Array<null>(8).fill(null),
  typetag,
];
const rows = (): FixtureRows => ({
  318: [
    [1, null, 9, 62, 6, "壁挂", ...TAG_SOURCE_FIELD_NAMES.map((_, index) => `标签${index + 1}`)],
  ],
  716: [type(9, "标签1,标签15,标签15,标签14"), type(901, "标签13")],
});

test("读取十二个来源并按 type 关联 typetag，保留稳定合并顺序", (context) => {
  const fixture = createFixture(rows());
  context.onTestFinished(fixture.cleanup);
  const metadata = readCatalogMetadata(fixture.input.tables, tags);
  const { value, proofs } = metadata.record(1);
  for (const [index, field] of TAG_SOURCE_FIELD_NAMES.entries())
    expect(value.fields[field]).toEqual([index + 1]);
  expect(value.typeTagIds).toEqual([1, 15, 14]);
  expect(value.tagIds).toEqual([...Array.from({ length: 12 }, (_, index) => index + 1), 15, 14]);
  expect(metadata.typeTags.get(901)).toEqual([13]);
  expect(proofs.find((proof) => proof.fieldPath === "tagIds")?.sources).toMatchObject([
    { table: 318, fields: [2, ...Array.from({ length: 12 }, (_, index) => index + 6)] },
    { table: 716, fields: [0, 10] },
  ]);
});

test("跨列重复去重，缺失类型按客户端默认零读取", (context) => {
  const input = rows();
  input[318] = [[1, null, null, null, null, "", "标签2,标签2", "标签2"]];
  input[716]!.push([0]);
  const fixture = createFixture(input);
  context.onTestFinished(fixture.cleanup);
  const { value } = readCatalogMetadata(fixture.input.tables, tags).record(1);
  expect(value.fields.type).toEqual([2]);
  expect(value.fields.showType).toEqual([2]);
  expect(value.fields.foodMaterials).toEqual([]);
  expect(value.tagIds).toEqual([2]);
});

test("合并不扩展标签祖先", (context) => {
  const input = rows();
  input[318] = [[1, null, 901, 9, 0, null, "标签15"]];
  const fixture = createFixture(input);
  context.onTestFinished(fixture.cleanup);
  expect(readCatalogMetadata(fixture.input.tables, tags).record(1).value.tagIds).toEqual([15, 13]);
});

test("范围外未知标签不影响正式记录，正式项未知标签必须包含表字段和 ID", (context) => {
  const input = rows();
  input[318]!.push([15572, null, 9, null, null, null, ...Array<null>(11).fill(null), "整理收纳"]);
  const fixture = createFixture(input);
  context.onTestFinished(fixture.cleanup);
  const metadata = readCatalogMetadata(fixture.input.tables, tags);
  expect(metadata.record(1).value.tagIds).toContain(15);
  expect(() => metadata.record(15572)).toThrow("318.17 (ID 15572): 整理收纳");
  expect(() => metadata.record(999)).toThrow("318 item 999");
});

test("缺失类型立即报错，所有类型的未知 typetag 必须校验", (context) => {
  const input = rows();
  input[716] = [type(901)];
  const fixture = createFixture(input);
  context.onTestFinished(fixture.cleanup);
  expect(() => readCatalogMetadata(fixture.input.tables, tags).record(1)).toThrow(
    "716 type 9 for BIdCfg 318.2 item 1",
  );
  input[716] = [type(9), type(999, "未知标签")];
  const invalid = createFixture(input);
  context.onTestFinished(invalid.cleanup);
  expect(() => readCatalogMetadata(invalid.input.tables, tags)).toThrow(
    "716.10 (ID 999): 未知标签",
  );
});
