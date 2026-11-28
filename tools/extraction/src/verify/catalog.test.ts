import fs from "node:fs";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { datasetFixture, material, plant } from "../../../../packages/schema/tests/fixture.ts";
import { createFixture } from "../extraction/source/neighbors/fixtures/tables.ts";
import { clientReadRecordsFixture } from "../extraction/fixtures/client-read-records.ts";
import { writeJson } from "../workflow/json.ts";
import { verifyCatalogSources } from "./catalog.ts";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import { verifyHarvestablePlants } from "./harvestable-plants.ts";

test("花株的收获物及字段依据均与冻结行核对", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [
      [20, { text: "白花株" }],
      [21, { text: "红花株" }],
    ],
    137: [],
    144: [],
    325: [],
    241: [
      [20, 10, 10],
      [21, 11, 11],
      [22, 99, 99],
    ],
  });
  onTestFinished(fixture.cleanup);
  const { tables } = fixture.input;
  const { catalog } = datasetFixture();
  const stock = {
    ...material(20),
    kind: "flowerPlant" as const,
    name: "白花株",
    harvestItemId: 10,
  };
  catalog.items = [
    { ...plant(10), category: "花" },
    { ...plant(11), category: "花" },
    stock,
    { ...stock, id: 21, name: "红花株", harvestItemId: 11 },
  ];
  const [white, red, other] = tables.rows(241);
  const proofs: FieldEvidence[] = [white, red].flatMap((row) =>
    ["kind", "harvestItemId"].map((fieldPath) => ({
      entity: { collection: "catalog.items", id: tables.id(row) },
      fieldPath,
      status: "confirmed" as const,
      reasonCode: null,
      ruleId: "test",
      sources: [
        {
          kind: "table" as const,
          file: "source/prepared/ed.obb",
          table: 241,
          rowOffset: row.rowOffset,
          fields: [0, 1, 2],
        },
      ],
    })),
  );
  const excluded = {
    id: 22,
    reason: "no_listed_flower" as const,
    sources: [
      {
        file: "prepared/ed.obb" as const,
        table: 241,
        row: 22,
        rowOffset: other.rowOffset,
        fields: [0, 1, 2],
      },
    ],
  };
  const verify = () =>
    verifyHarvestablePlants(tables, catalog, new Set([10, 11]), proofs, [excluded]);
  expect(verify()).toEqual(new Set([20, 21]));
  expect(() => verifyHarvestablePlants(tables, catalog, new Set([10, 11]), proofs, [])).toThrow(
    /Independent plant exclusions/,
  );
  proofs[1]!.sources = proofs[3]!.sources;
  expect(verify).toThrow(/Independent field evidence sources/);
  stock.harvestItemId = 11;
  expect(verify).toThrow(/Independent harvest 20/);
});

// 验收直接读取真实字节 fixture，不调用生产分类或事实 reader 生成 expected。
test("数据和证据同时篡改品阶、分类、标签或收录，独立来源仍拒绝", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [[1, { text: "物品" }, 1]],
    144: [],
    137: [],
    241: [],
    325: [],
    716: [[1]],
    93: [],
    111: [],
    113: [],
    153: [],
    154: [],
    267: [],
    269: [],
    659: [],
    474: [],
    708: [],
    563: [],
    568: [],
  });
  onTestFinished(fixture.cleanup);
  const source = path.join(fixture.directory, "independent");
  fs.mkdirSync(source);
  writeJson(path.join(source, "bindata-manifest.json"), [
    { Name: "633e15d6", file: "tags.json" },
    { Name: "b429c67e", file: "display.json" },
  ]);
  writeJson(path.join(source, "tags.json"), { AllNodes: {} });
  writeJson(path.join(source, "display.json"), { tags: {} });
  writeJson(path.join(source, "neighbor-allowlist.json"), []);
  writeJson(path.join(source, "supplemental-admissions.json"), {
    entries: [{ id: 1, category: "miscellaneous", subcategory: null, expectedName: "物品" }],
  });
  const dataset = datasetFixture();
  dataset.catalog.items = [{ ...material(1), quality: null }];
  const observations = clientReadRecordsFixture();
  observations.diagnostics.collection.items = [
    {
      id: 1,
      name: "物品",
      description: null,
      quality: null,
      image: null,
      encyclopediaEntry: null,
      category: "miscellaneous",
      kind: "item",
      subcategory: null,
      attributes: {},
    },
  ];
  expect(() =>
    verifyCatalogSources(dataset, observations, fixture.input.tables, source),
  ).not.toThrow();
  for (const mutation of ["quality", "kind", "tagIds", "admission"] as const) {
    const changed = structuredClone(dataset);
    const candidate = changed.catalog.items[0]!;
    if (mutation === "quality") Reflect.set(candidate, "quality", 4);
    if (mutation === "kind") Reflect.set(candidate, "kind", "plant");
    if (mutation === "tagIds") Reflect.set(candidate, "tagIds", [999]);
    if (mutation === "admission") changed.catalog.items = [];
    const proof = {
      entity: { collection: "catalog.items", id: 1 },
      fieldPath: mutation,
      status: "confirmed" as const,
      sources: [],
      ruleId: "mutated_together",
      reasonCode: null,
    };
    const changedObservations = structuredClone(observations);

    changedObservations.proofs.push({
      owner: "item",
      id: 1,
      field: mutation,
      status: proof.status,
      sources: proof.sources,
      ruleId: proof.ruleId,
      reasonCode: proof.reasonCode,
    });
    expect(() =>
      verifyCatalogSources(changed, changedObservations, fixture.input.tables, source),
    ).toThrow();
  }
});

test("表外外观通过独立准入，能识别指向同表无关行的证据", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [[601, { text: "短发" }, 1, null, null, null, "发型"]],
    144: [],
    137: [],
    241: [],
    716: [[1]],
    325: [],
    93: [],
    113: [
      [21, null, null, 601, 1],
      [22, null, null, null, 1],
    ],
    153: [],
    154: [],
    267: [],
    269: [],
    659: [],
    111: [],
    474: [],
    708: [],
    563: [],
    568: [],
  });
  onTestFinished(fixture.cleanup);
  const { tables } = fixture.input;
  const source = path.join(fixture.directory, "independent");
  fs.mkdirSync(source);
  writeJson(path.join(source, "bindata-manifest.json"), [
    { Name: "633e15d6", file: "tags.json", Source: "test.blk", PathID: "1" },
    { Name: "b429c67e", file: "display.json", Source: "test.blk", PathID: "2" },
  ]);
  writeJson(path.join(source, "tags.json"), {
    AllNodes: {
      1: { TagId: 1, TagName: "发型", ParentId: 4294967295 },
    },
  });
  writeJson(path.join(source, "display.json"), { tags: {} });
  writeJson(path.join(source, "neighbor-allowlist.json"), []);
  writeJson(path.join(source, "supplemental-admissions.json"), { entries: [] });

  const dataset = datasetFixture();
  dataset.gameplayTags.tags = [{ id: 1, internalName: "发型", parentId: null, displayName: null }];
  dataset.catalog.items = [
    {
      ...material(601),
      name: "短发",
      kind: "appearance",
      category: "发型",
      quality: null,
      tagIds: [1],
    },
  ];
  const observations = clientReadRecordsFixture();
  observations.diagnostics.collection.items = [
    {
      id: 601,
      name: "短发",
      description: null,
      quality: null,
      image: null,
      encyclopediaEntry: null,
      category: "clothing",
      kind: "appearance",
      subcategory: "发型",
    },
  ];
  const card = {
    kind: "table" as const,
    file: "prepared/ed.obb",
    table: 113,
    rowOffset: tables.rows(113)[0]!.rowOffset,
    fields: [0, 3, 4],
  };
  observations.diagnostics.admissions = [
    {
      id: 601,
      encyclopedia: { state: "absent", file: "prepared/ed.obb", table: 93 },
      admissionSources: [{ kind: "initial", rows: [card] }],
    },
  ];
  const kindProof: FieldEvidence = {
    entity: { collection: "catalog.items", id: 601 },
    fieldPath: "kind",
    status: "confirmed",
    reasonCode: null,
    ruleId: "fixture",
    sources: [card],
  };
  const categoryProof: FieldEvidence = {
    ...kindProof,
    fieldPath: "category",
    sources: [
      { ...card, table: 318, rowOffset: tables.rows(318)[0]!.rowOffset, fields: [6] },
      { kind: "asset", file: "test.blk", pathId: "1" },
      { kind: "asset", file: "test.blk", pathId: "2" },
    ],
  };
  expect([
    ...verifyCatalogSources(dataset, observations, tables, source, [kindProof, categoryProof]),
  ]).toEqual([601]);
  const unrelated = { ...card, rowOffset: tables.rows(113)[1]!.rowOffset };
  const changedProof = { ...kindProof, sources: [unrelated] };
  expect(() =>
    verifyCatalogSources(dataset, observations, tables, source, [changedProof, categoryProof]),
  ).toThrow(/Independent field evidence sources catalog\.items:601\.kind/);
  observations.diagnostics.admissions[0]!.admissionSources = [
    { kind: "initial", rows: [unrelated] },
  ];
  expect(() =>
    verifyCatalogSources(dataset, observations, tables, source, [changedProof, categoryProof]),
  ).toThrow(/Independent appearance admission 601/);
});
