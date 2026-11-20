import { expect, test } from "vite-plus/test";
import type { ItemOf } from "@loomix/schema/catalog";
import {
  datasetFixture,
  material,
  neighbor,
} from "../../../../../packages/schema/tests/fixture.ts";
import { buildDomainEvidence } from "./evidence.ts";

const source = { file: "prepared/ed.obb", table: 10, rowOffset: 100, fields: [0, 1] };

test("友邻子数据的来源归并到所属友邻的字段上，未发布集合被忽略", () => {
  const dataset = datasetFixture();
  const owner = neighbor(1);
  owner.stories = [
    { chapter: 2, title: "Chapter", paragraphs: [{ layout: "text", text: "正文", image: null }] },
  ];
  dataset.neighbors.neighbors.push(owner);
  const result = buildDomainEvidence(
    dataset,
    [],
    [],
    [
      { collection: "stories", key: "1:2:1", source },
      { collection: "stories", key: "1:2:2", source: { ...source, rowOffset: 200 } },
      { collection: "travelReactions", key: "1:1", source },
    ],
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    entity: { collection: "neighbors.neighbors", id: "1" },
    fieldPath: "stories",
    sources: [
      { kind: "table", ...source },
      { kind: "table", ...source, rowOffset: 200 },
    ],
  });
});

test("最终 kind 合并分类规则来源，展示分类映射到公开字段", () => {
  const dataset = datasetFixture();
  const furniture: ItemOf<"furniture"> = {
    ...material(1),
    kind: "furniture",
    category: "桌",
    furnitureCategory: "基础家具·桌",
    size: null,
  };
  dataset.catalog.items.push(furniture);
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
  const result = buildDomainEvidence(dataset, observed, [], []);
  expect(result.map((proof) => proof.fieldPath).sort()).toEqual([
    "category",
    "furnitureCategory",
    "kind",
  ]);
  expect(result.find((proof) => proof.fieldPath === "kind")).toMatchObject({
    ruleId: "client.catalog.classification.furniture.item",
    sources: [{ table: 33 }, { table: 318 }],
  });
  Reflect.set(furniture, "kind", "clothing");
  expect(() => buildDomainEvidence(dataset, observed, [], [])).toThrow(
    "Classification evidence mismatch",
  );
});

test("友邻字段保留精确路径和未确认原因，图片交给统一组装投影", () => {
  const dataset = datasetFixture();
  const owner = neighbor(1010);
  owner.abilities = [{ unlockLevel: 5, name: "作物浇水", description: null }];
  owner.house = { stages: [{ id: 1, level: 1, name: "房屋", description: null, image: null }] };
  dataset.neighbors.neighbors.push(owner);
  const table = { kind: "table" as const, ...source, table: 222 };
  const result = buildDomainEvidence(
    dataset,
    [],
    [],
    [
      {
        collection: "neighbors",
        key: "1010",
        source: table,
        fieldPath: "house.stages.0.image",
        status: "confirmed",
        reasonCode: null,
      },
      {
        collection: "neighbors",
        key: "1010",
        source: table,
        fieldPath: "abilities.0.description",
        status: "unresolved",
        reasonCode: "ability_field_not_configured",
      },
    ],
  );
  expect(result.some((proof) => proof.fieldPath.endsWith("image"))).toBe(false);
  expect(result).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fieldPath: "abilities.0.description",
        status: "unresolved",
        reasonCode: "ability_field_not_configured",
      }),
    ]),
  );
});
