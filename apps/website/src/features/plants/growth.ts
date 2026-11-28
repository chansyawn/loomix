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

export function plantMatureForms(
  seeds: readonly PlantSeed[],
  plantId: number,
  stocks: readonly Pick<HarvestablePlant, "id" | "name" | "image">[],
) {
  type Stage = PlantGrowth["stages"][number];
  const forms = new Map<string, { key: string; stage: Stage; seeds: PlantSeed[] }>();
  for (const seed of seeds) {
    const { growth } = seed;
    if (growth.kind !== "crop") continue;
    const stagesById = new Map(growth.stages.map((stage) => [stage.id, stage]));
    for (const id of new Set(growth.matureStages.map((stage) => stage.stageId))) {
      const stage = stagesById.get(id);
      if (stage?.plantId !== plantId) continue;
      if (
        stocks.some(
          (stock) =>
            stock.id === stage.stockId && stock.name === stage.name && stock.image === stage.image,
        )
      )
        continue;
      const key = JSON.stringify([stage.id, stage.name, stage.image]);
      const form = forms.get(key);
      if (form) form.seeds.push(seed);
      else forms.set(key, { key, stage, seeds: [seed] });
    }
  }
  return [...forms.values()];
}
