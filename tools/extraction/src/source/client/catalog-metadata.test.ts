import { expect, test } from "vite-plus/test";
import { RECORD_TAG_FIELD_NAMES } from "@loomix/schema/catalog";
import { createGameplayTagIndex } from "@loomix/schema/gameplay-tags";
import { createFixture } from "../../extraction/neighbors/fixtures/tables.ts";
import type { FixtureRows } from "../../extraction/neighbors/fixtures/tables.ts";
import { readCatalogMetadata } from "./catalog-metadata.ts";

const tags = createGameplayTagIndex(
  Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    internalName: `标签${index + 1}`,
    displayName: null,
    enumName: null,
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
    [1, null, 9, 62, 6, "壁挂", ...RECORD_TAG_FIELD_NAMES.map((_, index) => `标签${index + 1}`)],
  ],
  716: [type(9, "标签1,标签15,标签15,标签14"), type(901, "标签13")],
});

test("读取十二个来源并按 type 关联 typetag，保留原始来源与稳定合并顺序", (context) => {
  const fixture = createFixture(rows());
  context.onTestFinished(fixture.cleanup);
  const metadata = readCatalogMetadata(fixture.input.tables, tags);
  const { value, proofs } = metadata.record(1);
  expect(value.client).toEqual({ type: 9, idType: 62, subtype: 6, subtypeName: "壁挂" });
  for (const [index, field] of RECORD_TAG_FIELD_NAMES.entries()) {
    expect(value.tagFields[field]).toEqual([index + 1]);
    expect(proofs.find((proof) => proof.fieldPath === `tagFields.${field}`)).toMatchObject({
      status: "confirmed",
      sources: [{ table: 318, fields: [index + 6] }],
    });
  }
  expect(value.tagIds).toEqual([...Array.from({ length: 12 }, (_, index) => index + 1), 15, 14]);
  expect(metadata.clientTypes).toEqual([
    { id: 9, name: "类型9", tagIds: [1, 15, 14] },
    { id: 901, name: "类型901", tagIds: [13] },
  ]);
  expect(proofs.find((proof) => proof.fieldPath === "tagIds")?.sources).toMatchObject([
    { table: 318, fields: [2, ...Array.from({ length: 12 }, (_, index) => index + 6)] },
    { table: 716, fields: [0, 10] },
  ]);
  expect(
    metadata
      .clientTypeProofs(9)
      .every((proof) => proof.sources[0]?.kind === "table" && proof.sources[0].table === 716),
  ).toBe(true);
});

test("跨列重复保留出处，缺失数值按客户端默认零读取，空字符串归 null", (context) => {
  const input = rows();
  input[318] = [[1, null, null, null, null, "", "标签2,标签2", "标签2"]];
  input[716]!.push([0]);
  const fixture = createFixture(input);
  context.onTestFinished(fixture.cleanup);
  const metadata = readCatalogMetadata(fixture.input.tables, tags);
  const { value, proofs } = metadata.record(1);
  expect(value.client).toEqual({ type: 0, idType: 0, subtype: 0, subtypeName: null });
  expect(value.tagFields.type).toEqual([2]);
  expect(value.tagFields.showType).toEqual([2]);
  expect(value.tagFields.foodMaterials).toEqual([]);
  expect(value.tagIds).toEqual([2]);
  expect(proofs.find((proof) => proof.fieldPath === "client.subtype")).toMatchObject({
    status: "confirmed",
    ruleId: "client.catalog.uint_default_zero",
  });
  expect(proofs.find((proof) => proof.fieldPath === "tagFields.foodMaterials")).toMatchObject({
    status: "absent",
    reasonCode: "not_configured",
  });
  expect(metadata.clientTypes[0]).toEqual({ id: 0, name: null, tagIds: [] });
});

test("type 901 与 idType 9 分别保留，合并不扩展标签祖先", (context) => {
  const input = rows();
  input[318] = [[1, null, 901, 9, 0, null, "标签15"]];
  const fixture = createFixture(input);
  context.onTestFinished(fixture.cleanup);
  expect(readCatalogMetadata(fixture.input.tables, tags).record(1).value).toMatchObject({
    client: { type: 901, idType: 9 },
    tagIds: [15, 13],
  });
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
