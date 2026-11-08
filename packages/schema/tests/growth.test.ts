import { expect, test } from "vite-plus/test";
import { GrowthSchema, growthPlantIds, validatePlantings } from "../src/catalog/index.ts";

const staged = {
  id: 10,
  kind: "staged" as const,
  maturityDays: null,
  stages: [
    { id: 20, name: "幼苗", image: null, plantId: null },
    { id: 21, name: "植株", image: null, plantId: 1 },
    { id: 22, name: "后续形态", image: null, plantId: null },
  ],
};
const seed = { id: 10, growthId: 10 };

test("staged growth preserves order and derives associations beyond its last stage", () => {
  expect(GrowthSchema.parse(staged)).toEqual(staged);
  expect(growthPlantIds(staged)).toEqual([1]);
  expect(validatePlantings([seed], [staged], new Set([1]))).toEqual([]);
  expect(() => GrowthSchema.parse({ ...staged, harvestCount: 3 })).toThrow();
});

test("crop growth validates roles, plant references and duplicate assignments", () => {
  const crop = {
    ...staged,
    kind: "crop" as const,
    cycleMode: null,
    initialStageIds: [20],
    regrowthStageIds: [20],
    matureStages: [{ stageId: 21, tag: null, rank: null }],
    witheredStageId: 22,
    harvestCount: 3,
  };
  expect(GrowthSchema.parse(crop)).toEqual(crop);
  expect(validatePlantings([seed], [crop], new Set([1]))).toEqual([]);
  for (const broken of [
    { ...crop, initialStageIds: [99] },
    { ...crop, matureStages: [{ stageId: 20, tag: null, rank: null }] },
    { ...crop, regrowthStageIds: [20, 20] },
    { ...crop, stages: [...crop.stages, crop.stages[0]] },
  ])
    expect(validatePlantings([seed], [broken], new Set([1])).length).toBeGreaterThan(0);
});

test("plantings reject dangling seeds, orphan configurations and unclassified plants", () => {
  for (const [seeds, growths, plants] of [
    [[seed], [], new Set([1])],
    [[], [staged], new Set([1])],
    [[seed], [staged], new Set<number>()],
    [[seed, seed], [staged], new Set([1])],
  ] as const)
    expect(validatePlantings(seeds, growths, plants).length).toBeGreaterThan(0);
});
