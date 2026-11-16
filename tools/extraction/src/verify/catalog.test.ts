import fs from "node:fs";
import path from "node:path";
import { test, expect } from "vite-plus/test";
import { datasetFixture, material } from "../../../../packages/schema/tests/fixture.ts";
import { createFixture } from "../extraction/source/neighbors/fixtures/tables.ts";
import { observationFixture } from "../extraction/fixtures/observations.ts";
import { writeJson } from "../workflow/json.ts";
import { verifyCatalogSources } from "./catalog.ts";

// 验收直接读取真实字节 fixture，不调用生产分类或事实 reader 生成 expected。
test("数据和证据同时篡改品阶、分类、标签或收录，独立来源仍拒绝", ({ onTestFinished }) => {
  const fixture = createFixture({
    318: [[1, { text: "物品" }, 1]],
    325: [],
    716: [[1]],
    93: [],
    474: [],
    708: [],
    563: [],
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
  const observations = observationFixture();
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
