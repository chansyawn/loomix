import { expect, test } from "vite-plus/test";
import { GrowthSchema, growthPlantIds, validateGrowth } from "../src/catalog/index.ts";
import type { Growth } from "../src/catalog/index.ts";

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
