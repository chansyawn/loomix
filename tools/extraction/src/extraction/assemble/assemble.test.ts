import { expect, test } from "vite-plus/test";
import { collection, material } from "../../../../../packages/schema/tests/fixture.ts";
import { clientReadRecordsFixture } from "../fixtures/client-read-records.ts";
import { emptyFlowerHybridization } from "../fixtures/flower-hybridization.ts";
import { assemble } from "./index.ts";
import { objectIdentity } from "../images/model.ts";
import type { ImageNeed, ImageObject } from "../images/model.ts";

const object: ImageObject = {
  key: objectIdentity("a".repeat(64), "Sprite", "1"),
  packageSha256: "a".repeat(64),
  source: "fixture.blk",
  assetType: "Sprite",
  pathId: "1",
  container: "fixture",
  resourceName: "Fixture",
};
const original = {
  object: object.key,
  file: `originals/${"b".repeat(64)}.png`,
  sha256: "b".repeat(64),
  width: 20,
  height: 20,
};
const need = (
  kind: ImageNeed["owner"]["kind"],
  id: number,
  variant: ImageNeed["variant"],
): ImageNeed => ({
  id: `${kind}:${id}:image`,
  owner: { kind, id, field: "image" },
  variant,
  required: false,
  references: ["UISprite/Fixture"],
  candidates: [{ object: object.key, reference: "UISprite/Fixture", rank: 0 }],
  sources: [{ kind: "table", file: "prepared/ed.obb", table: 325, rowOffset: 2, fields: [5] }],
  reason: "unconfigured",
});

test("同一源对象跨用途共享原图，组装同时投影图片引用和具体来源", () => {
  const observations = clientReadRecordsFixture();
  observations.imageObjects = [object];
  observations.imageNeeds = [need("item", 1, "icon"), need("collection", 2, "banner")];
  observations.catalog.items = [
    {
      ...material(1),
      kind: "furniture",
      category: null,
      furnitureCategory: null,
      size: null,
      image: { use: "item:1:image" },
    },
  ];
  observations.catalog.collections = [
    { ...collection(2, "furniture", [1]), image: { use: "collection:2:image" } },
  ];
  const input = emptyFlowerHybridization(observations.source);
  const result = assemble(observations, [original], input);
  expect(result.dataset.catalog.items[0]).toMatchObject({
    image: { assetId: object.key, variant: "icon" },
  });
  expect(result.dataset.catalog.collections[0]).toMatchObject({
    image: { assetId: object.key, variant: "banner" },
  });
  expect(result.imageJobs).toHaveLength(2);
  expect(result.fieldEvidence.fields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        entity: { collection: "catalog.items", id: 1 },
        fieldPath: "image",
        status: "confirmed",
        sources: [
          { kind: "table", file: "source/prepared/ed.obb", table: 325, rowOffset: 2, fields: [5] },
          { kind: "asset", file: "fixture.blk", pathId: "1" },
        ],
      }),
    ]),
  );
  observations.diagnostics.investigation.acquisitionHints.displayRows = [
    {
      id: 1,
      sourceIds: [156],
      source: { file: "prepared/ed.obb", table: 325, row: 1, rowOffset: 2, fields: [0, 2] },
    },
    {
      id: 1,
      sourceIds: [999],
      source: { file: "prepared/ed.obb", table: 325, row: 1, rowOffset: 3, fields: [0, 2] },
    },
  ];
  expect(JSON.stringify(assemble(observations, [original], input))).toBe(JSON.stringify(result));
});

test("种子和同号阶段保留独立用途，缺图原因投影到嵌套字段", () => {
  const observations = clientReadRecordsFixture();
  const seed = need("seed", 1, "icon");
  const stage = need("stage", 1, "icon");
  stage.references = [];
  stage.candidates = [];
  observations.imageObjects = [object];
  observations.imageNeeds = [seed, stage];
  observations.catalog.items = [
    {
      ...material(1),
      kind: "seed",
      image: { use: seed.id },
      growth: {
        kind: "staged",
        stages: [{ id: 1, name: "幼苗", plantId: 2, image: { use: stage.id } }],
      },
    },
  ];
  observations.catalog.items.push({
    ...material(2),
    kind: "plant",
    category: null,
    flowerColors: null,
    drops: null,
    image: { use: "plant:2:image" },
  });
  const plantNeed = need("item", 2, "icon");
  plantNeed.id = "plant:2:image";
  plantNeed.candidates = [];
  plantNeed.references = [];
  observations.imageNeeds.push(plantNeed);
  const result = assemble(observations, [original], emptyFlowerHybridization(observations.source));
  expect(result.imageJobs).toHaveLength(1);
  expect(result.imageBindings).toEqual(
    expect.arrayContaining([
      { use: seed.id, object: object.key, reason: null },
      { use: stage.id, object: null, reason: stage.reason },
    ]),
  );
  expect(result.fieldEvidence.fields).toContainEqual(
    expect.objectContaining({
      entity: { collection: "catalog.items", id: 1 },
      fieldPath: "growth.stages.0.image",
      status: "unresolved",
      reasonCode: stage.reason,
    }),
  );
});

test("同图不同 owner 不得借用对方用途，防止图片正确但来源归属错误", () => {
  const observations = clientReadRecordsFixture();
  observations.imageObjects = [object];
  observations.imageNeeds = [need("item", 1, "icon"), need("item", 2, "icon")];
  observations.catalog.items = [{ ...material(1), image: { use: "item:2:image" } }];
  expect(() =>
    assemble(observations, [original], emptyFlowerHybridization(observations.source)),
  ).toThrow("different owner");
  observations.catalog.items = [
    { ...material(1), image: { use: "item:1:image" } },
    { ...material(2), image: { use: "item:2:image" } },
  ];
  const result = assemble(observations, [original], emptyFlowerHybridization(observations.source));
  expect(result.imageJobs).toHaveLength(1);
  expect(
    result.fieldEvidence.fields
      .filter((proof) => proof.fieldPath === "image")
      .map((proof) => proof.entity.id),
  ).toEqual([1, 2]);
});
