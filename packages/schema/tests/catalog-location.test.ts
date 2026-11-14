import { expect, test } from "vite-plus/test";
import { validateDataset } from "../src/dataset/index.ts";
import { RecordSchema, recordTarget, recordFocus, resolveItem } from "../src/catalog/index.ts";
import { datasetFixture, recordMetadata } from "./fixture.ts";
const context = { formatVersion: 8, snapshotId: "a".repeat(64), locale: "zh-CN" } as const;
function fixture() {
  const catalog = datasetFixture(context, {
    gameVersion: "test",
    dataRevision: 1,
    resourceRevision: 1,
    manifestId: "1",
  }).catalog;
  const base = {
    ...recordMetadata(),
    name: "植物",
    image: null,
    quality: null,
    description: null,
    acquisition: null,
  };
  catalog.records.push(
    RecordSchema.parse({
      ...base,
      id: 1,
      kind: "plant",
      displayCategory: "作物",
      trade: null,
      flowerColors: null,
      drops: null,
      hybridRecipes: null,
    }),
    RecordSchema.parse({
      ...base,
      id: 2,
      kind: "plant",
      displayCategory: "作物",
      trade: null,
      flowerColors: null,
      drops: null,
      hybridRecipes: null,
    }),
    RecordSchema.parse({ ...base, id: 10, kind: "plants.series", memberIds: [1, 2] }),
    RecordSchema.parse({
      ...base,
      id: 20,
      kind: "seed",
      growthId: 20,
      trade: null,
      admissionReasons: ["deterministicSeed"],
    }),
  );
  catalog.growths.push({
    id: 20,
    kind: "crop",
    cycleMode: null,
    maturityDays: null,
    initialStageIds: [100],
    regrowthStageIds: null,
    matureStages: [
      { stageId: 101, tag: null, rank: null },
      { stageId: 102, tag: null, rank: null },
    ],
    witheredStageId: null,
    harvestCount: 1,
    stages: [
      { id: 100, name: "苗", image: null, plantId: null },
      { id: 101, name: "成熟", image: null, plantId: 1 },
      { id: 102, name: "成熟", image: null, plantId: 2 },
    ],
  });
  return catalog;
}
test("种子与产物的canonical定位幂等，外来focus不合法", () => {
  const catalog = fixture();
  expect(recordTarget(catalog, 1)).toEqual({ recordId: 10, focus: 1 });
  expect(recordTarget(catalog, 20)).toEqual({ recordId: 10, focus: 20 });
  expect(recordTarget(catalog, 10)).toEqual({ recordId: 10 });
  expect(recordFocus(catalog, 10, 20)).toBe(20);
  expect(recordFocus(catalog, 10, 999)).toBeUndefined();
  expect(recordFocus(catalog, 10, 10)).toBeUndefined();
  catalog.references.push({ id: 99, name: "材料" });
  expect(recordTarget(catalog, 99)).toBeNull();
  expect(resolveItem(catalog, 99)?.kind).toBe("reference");
});
test("目的地歧义必须在数据验收阶段失败", () => {
  const catalog = fixture(),
    dataset = datasetFixture(context, {
      gameVersion: "test",
      dataRevision: 1,
      resourceRevision: 1,
      manifestId: "1",
    });
  dataset.catalog = catalog;
  expect(validateDataset(dataset)).toEqual([]);
  catalog.records.push({
    ...catalog.records.find((record) => record.kind === "plants.series")!,
    id: 11,
  });
  expect(
    validateDataset(dataset).some((issue) => issue.message.includes("Ambiguous plant series")),
  ).toBe(true);
});
test("直接标签拒绝重复引用与悬空父级", () => {
  const catalog = fixture(),
    dataset = datasetFixture(context, {
      gameVersion: "test",
      dataRevision: 1,
      resourceRevision: 1,
      manifestId: "1",
    });
  dataset.catalog = catalog;
  dataset.gameplayTags.tags.push({
    id: 77,
    internalName: "红色",
    displayName: "红色",
    enumName: "Red",
    parentId: 78,
  });
  catalog.records[0]!.tagIds = [77, 77];
  const issues = validateDataset(dataset).map((issue) => issue.message);
  expect(issues).toContain("Unknown parent tag 78");
  expect(issues).toContain("Duplicate identity 77");
});
