import { expect, test } from "vite-plus/test";
import { growthStageGroups, matureFormMatchesStock, plantMatureForms } from "./growth";
import { plantSeedFixture } from "./fixture";
import type { PlantGrowth } from "./model";

const growth: Extract<PlantGrowth, { kind: "crop" }> = {
  kind: "crop",
  harvestCount: 2,
  initialStageIds: [11],
  matureStages: [
    { stageId: 13, tag: null, rank: null },
    { stageId: 12, tag: null, rank: null },
  ],
  regrowthStageIds: [11],
  witheredStageId: 14,
  stages: [
    { id: 11, name: "幼苗", image: null, plantId: null },
    { id: 12, name: "成熟", image: "first", plantId: 1 },
    { id: 13, name: "成熟", image: "second", plantId: 1 },
    { id: 14, name: "枯萎", image: null, plantId: null },
  ],
};

test("按明确阶段角色分组，成熟形态使用角色顺序而非阶段数组顺序", () => {
  expect(growthStageGroups(growth)).toEqual([
    { label: "初始生长", ids: [11] },
    { label: "成熟形态", ids: [13, 12] },
    { label: "再次生长", ids: [11] },
    { label: "枯萎形态", ids: [14] },
  ]);
  const seed = plantSeedFixture({ id: 10, growth });
  expect(plantMatureForms([seed], 1)[0].stages.map((stage) => stage.image)).toEqual([
    "second",
    "first",
  ]);
});

test("保留全部种子来源，过滤其他产物、非成熟阶段和缺失阶段", () => {
  const first = plantSeedFixture({
    id: 10,
    growth: {
      ...growth,
      matureStages: [
        ...growth.matureStages,
        growth.matureStages[0],
        { stageId: 99, tag: null, rank: null },
      ],
    },
  });
  const second = plantSeedFixture({
    id: 20,
    growth: {
      ...growth,
      stages: growth.stages.map((stage) => (stage.id === 12 ? { ...stage, plantId: 2 } : stage)),
    },
  });
  const forms = plantMatureForms([first, second], 1);
  expect(forms.map(({ seed }) => seed.id)).toEqual([10, 20]);
  expect(forms.map(({ stages }) => stages.map((stage) => stage.id))).toEqual([[13, 12], [13]]);
  expect(plantMatureForms([first], 2)).toEqual([]);
});

test("唯一成熟形态与来源植株的目标、名称和图片均相同时合并", () => {
  const stock = { id: 12, name: "番茄株", image: "tomato" };
  const stage = { ...stock, stockId: stock.id, plantId: 1 };
  const group = { seed: plantSeedFixture(), stages: [stage] };
  expect(matureFormMatchesStock([group], [stock])).toBe(true);
  for (const other of [
    { ...stock, id: 13 },
    { ...stock, name: "变种" },
    { ...stock, image: "other" },
  ])
    expect(matureFormMatchesStock([group], [other])).toBe(false);
  expect(
    matureFormMatchesStock([{ ...group, stages: [{ ...stage, stockId: undefined }] }], [stock]),
  ).toBe(false);
  expect(matureFormMatchesStock([group], [stock, { ...stock, id: 13 }])).toBe(false);
  expect(
    matureFormMatchesStock([{ ...group, stages: [stage, { ...stage, id: 13 }] }], [stock]),
  ).toBe(false);
  expect(
    matureFormMatchesStock([group, { ...group, seed: plantSeedFixture({ id: 22 }) }], [stock]),
  ).toBe(false);
});

test("普通阶段仅保留既有顺序，不推测成熟状态；缺失生长角色不创建空组", () => {
  const seed = plantSeedFixture({ id: 30, plantIds: [2, 1] });
  expect(growthStageGroups(seed.growth)).toEqual([
    { label: "阶段", ids: seed.growth.stages.map((stage) => stage.id) },
  ]);
  expect(plantMatureForms([seed], 1)).toEqual([]);
  expect(
    growthStageGroups({ ...growth, regrowthStageIds: [], witheredStageId: null }).map(
      (group) => group.label,
    ),
  ).toEqual(["初始生长", "成熟形态"]);
});
