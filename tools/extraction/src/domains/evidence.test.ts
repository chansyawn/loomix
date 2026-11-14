import { expect, test } from "vite-plus/test";
import { RecordSchema } from "@loomix/schema/catalog";
import { recordMetadata } from "../../../../packages/schema/tests/fixture.ts";
import { emptyDataset } from "@loomix/schema/dataset";
import { buildDomainEvidence } from "./evidence.ts";

test("story paragraphs merge their provenance on the actual chapter entity", () => {
  const dataset = emptyDataset(
    { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
    {
      gameVersion: "test",
      dataRevision: 1,
      resourceRevision: 1,
      manifestId: "1",
    },
  );
  dataset.neighbors.stories.push({
    key: "1:2",
    neighborId: 1,
    chapter: 2,
    title: "Chapter",
    paragraphs: [],
  });
  const source = { file: "prepared/ed.obb", table: 10, rowOffset: 100, fields: [0, 1] };
  const result = buildDomainEvidence(
    dataset,
    [],
    [],
    [],
    [
      {
        domain: "neighbors",
        records: [
          { collection: "stories", key: "1:2:1", source },
          { collection: "stories", key: "1:2:2", source: { ...source, rowOffset: 200 } },
          { collection: "encounterIslands", key: "missing", source },
        ],
      },
    ],
  );
  expect(result.fields).toHaveLength(1);
  expect(result.fields[0]).toMatchObject({
    entity: { collection: "neighbors.stories", id: "1:2" },
    sources: [
      { kind: "table", ...source },
      { kind: "table", ...source, rowOffset: 200 },
    ],
  });
});

test("最终 kind 合并分类规则来源，展示分类映射到公开字段", () => {
  const dataset = emptyDataset(
    { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" },
    { gameVersion: "test", dataRevision: 1, resourceRevision: 1, manifestId: "1" },
  );
  dataset.catalog.records.push(
    RecordSchema.parse({
      ...recordMetadata(),
      id: 1,
      name: "家具",
      image: null,
      quality: null,
      description: null,
      kind: "furniture",
      displayCategory: "桌",
      furnitureCategory: "基础家具·桌",
      trade: null,
      acquisition: null,
    }),
  );
  const base = {
    id: 1,
    group: "furniture.item" as const,
    evidence: { table: 318, field: 2 },
    association: "fixture",
    transformation: "fixture",
    status: "confirmed" as const,
  };
  const observed = [
    {
      ...base,
      field: "category",
      value: "furniture",
      sources: [{ file: "prepared/ed.obb", table: 33, rowOffset: 200, fields: [0, 5] }],
    },
    {
      ...base,
      field: "kind",
      value: "item",
      sources: [{ file: "prepared/ed.obb", table: 318, rowOffset: 100, fields: [2] }],
    },
    {
      ...base,
      field: "subcategory",
      value: "桌",
      sources: [{ file: "prepared/ed.obb", table: 33, rowOffset: 200, fields: [4] }],
    },
    {
      ...base,
      field: "attributes.type",
      value: "基础家具·桌",
      sources: [{ file: "prepared/ed.obb", table: 265, rowOffset: 300, fields: [2, 4, 5] }],
    },
  ];
  const result = buildDomainEvidence(dataset, observed, [], [], []);
  expect(result.fields.map((proof) => proof.fieldPath).sort()).toEqual([
    "displayCategory",
    "furnitureCategory",
    "kind",
  ]);
  expect(result.fields.find((proof) => proof.fieldPath === "kind")).toMatchObject({
    ruleId: "client.catalog.classification.furniture.item",
    sources: [{ table: 33 }, { table: 318 }],
  });
  Reflect.set(dataset.catalog.records[0]!, "kind", "clothing");
  expect(() => buildDomainEvidence(dataset, observed, [], [], [])).toThrow(
    "Classification evidence mismatch",
  );
});
