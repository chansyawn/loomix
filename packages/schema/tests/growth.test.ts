import { expect, test } from "vite-plus/test";
import {
  GrowthSchema,
  growthPlantIds,
  validateGrowth,
  validateCatalog,
} from "../src/catalog/index.ts";
import type { Growth } from "../src/catalog/index.ts";
import { datasetFixture, material, plant, seed } from "./fixture.ts";

const staged: Growth = {
  kind: "staged",
  stages: [
    { id: 20, name: "幼苗", image: null, plantId: null },
    { id: 21, name: "植株", image: null, plantId: 1 },
    { id: 22, name: "后续形态", image: null, plantId: null },
  ],
};
const crop: Growth = {
  ...staged,
  kind: "crop",
  initialStageIds: [20],
  regrowthStageIds: [20],
  matureStages: [{ stageId: 21, tag: null, rank: null }],
  witheredStageId: 22,
  harvestCount: 3,
};

test("植株使用独立物品 ID，收获物分类及阶段关联必须一致", () => {
  const { catalog } = datasetFixture();
  const tomato = { ...plant(1), category: "作物" };
  const flower = { ...plant(2), category: "花" };
  const stock = { ...material(21), kind: "cropPlant" as const, harvestItemId: 1 };
  const flowerStock = { ...material(50), kind: "flowerPlant" as const, harvestItemId: 2 };
  const valid = [tomato, flower, seed(30, crop), stock, flowerStock];
  expect(validateCatalog({ ...catalog, items: valid })).toEqual([]);
  for (const changed of [
    [...valid, stock],
    [...valid.slice(0, 3), { ...stock, harvestItemId: 2 }],
    [tomato, flower, { ...flowerStock, harvestItemId: 99 }],
    [...valid.slice(0, 3), { ...flowerStock, id: 21 }],
  ])
    expect(validateCatalog({ ...catalog, items: changed })).not.toEqual([]);
});

test("阶段式生长保留顺序，并从任意阶段派生植物关联", () => {
  expect(GrowthSchema.parse(staged)).toEqual(staged);
  expect(growthPlantIds(staged)).toEqual([1]);
  expect(validateGrowth(staged)).toEqual([]);
  expect(() => GrowthSchema.parse({ ...staged, harvestCount: 3 })).toThrow();
});

test("作物生长校验阶段角色、成熟植物和重复分配", () => {
  expect(GrowthSchema.parse(crop)).toEqual(crop);
  expect(validateGrowth(crop)).toEqual([]);
  for (const broken of [
    { ...crop, initialStageIds: [99] },
    { ...crop, matureStages: [{ stageId: 20, tag: null, rank: null }] },
    { ...crop, regrowthStageIds: [20, 20] },
    { ...crop, stages: [...crop.stages, crop.stages[0]!] },
    { ...crop, stages: crop.stages.map((stage) => ({ ...stage, plantId: null })) },
  ] satisfies Growth[])
    expect(validateGrowth(broken).length).toBeGreaterThan(0);
});
