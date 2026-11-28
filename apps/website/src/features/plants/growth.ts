import type { HarvestablePlant, PlantGrowth, PlantSeed } from "./model";

export function growthStageGroups(growth: PlantGrowth) {
  if (growth.kind === "staged")
    return [{ label: "阶段", ids: growth.stages.map((stage) => stage.id) }];
  return [
    { label: "初始生长", ids: growth.initialStageIds },
    { label: "成熟形态", ids: growth.matureStages.map((stage) => stage.stageId) },
    { label: "再次生长", ids: growth.regrowthStageIds ?? [] },
    { label: "枯萎形态", ids: growth.witheredStageId === null ? [] : [growth.witheredStageId] },
  ].filter((group) => group.ids.length > 0);
}

export function plantMatureForms(seeds: readonly PlantSeed[], plantId: number) {
  return seeds.flatMap((seed) => {
    const { growth } = seed;
    if (growth.kind !== "crop") return [];
    const stagesById = new Map(growth.stages.map((stage) => [stage.id, stage]));
    const stages = [...new Set(growth.matureStages.map((stage) => stage.stageId))].flatMap((id) => {
      const stage = stagesById.get(id);
      return stage?.plantId === plantId ? [stage] : [];
    });
    return stages.length > 0 ? [{ seed, stages }] : [];
  });
}

export function matureFormMatchesStock(
  forms: ReturnType<typeof plantMatureForms>,
  stocks: readonly Pick<HarvestablePlant, "id" | "name" | "image">[],
) {
  if (stocks.length !== 1 || forms.length !== 1 || forms[0].stages.length !== 1) return false;
  const [stock] = stocks;
  const [stage] = forms[0].stages;
  return stage.stockId === stock.id && stage.name === stock.name && stage.image === stock.image;
}
