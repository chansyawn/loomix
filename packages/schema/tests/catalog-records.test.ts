import { expect, test } from "vite-plus/test";
import { validateDataset } from "../src/dataset/index.ts";
import { RecordSchema, resolveItem } from "../src/catalog/index.ts";
import { datasetFixture, recordMetadata } from "./fixture.ts";
const context = { formatVersion: 9, snapshotId: "a".repeat(64), locale: "zh-CN" } as const;
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
test("正式记录与仅供引用的物品身份分开解析", () => {
  const catalog = fixture();
  for (const id of [1, 2, 10, 20])
    expect(resolveItem(catalog, id)).toMatchObject({ kind: "record", value: { id } });
  catalog.references.push({ id: 99, name: "材料" });
  expect(resolveItem(catalog, 99)?.kind).toBe("reference");
  expect(resolveItem(catalog, 999)).toBeNull();
});
test("作物与种子不依赖唯一系列，仍校验正式成员和生长引用", () => {
  const dataset = datasetFixture(context, {
    gameVersion: "test",
    dataRevision: 1,
    resourceRevision: 1,
    manifestId: "1",
  });
  const catalog = fixture();
  dataset.catalog = catalog;
  catalog.records.push({
    ...catalog.records.find((record) => record.kind === "plants.series")!,
    id: 11,
  });
  expect(validateDataset(dataset)).toEqual([]);
  catalog.records = catalog.records.filter((record) => record.kind !== "plants.series");
  expect(validateDataset(dataset)).toEqual([]);
  catalog.growths[0]!.stages[1]!.plantId = 999;
  expect(
    validateDataset(dataset).some((issue) => issue.message.includes("Unknown plant 999")),
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
