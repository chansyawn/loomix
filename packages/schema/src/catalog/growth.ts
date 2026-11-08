import { z } from "zod";
import { IdSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";

const text = z.string().min(1).nullable();

export function createGrowthSchema<I extends z.ZodType>(image: I) {
  const base = z.strictObject({
    id: IdSchema,
    stages: z
      .array(
        z.strictObject({
          id: IdSchema,
          name: z.string().min(1),
          image,
          plantId: IdSchema.nullable(),
        }),
      )
      .min(1),
    maturityDays: IdSchema.nullable(),
  });
  return z.discriminatedUnion("kind", [
    base.extend({
      kind: z.literal("crop"),
      cycleMode: text,
      initialStageIds: IdSchema.array().min(1),
      regrowthStageIds: IdSchema.array().nullable(),
      matureStages: z.array(z.strictObject({ stageId: IdSchema, tag: text, rank: text })).min(1),
      witheredStageId: IdSchema.nullable(),
      harvestCount: IdSchema.nullable(),
    }),
    base.extend({ kind: z.literal("staged") }),
  ]);
}

export const GrowthSchema = createGrowthSchema(ImageRefSchema.nullable());
export type Growth = z.infer<typeof GrowthSchema>;
export type GrowthStage = Growth["stages"][number];

export function growthPlantIds(growth: {
  stages: readonly { plantId: number | null }[];
}): number[] {
  return [
    ...new Set(growth.stages.flatMap((stage) => (stage.plantId === null ? [] : [stage.plantId]))),
  ].sort((a, b) => a - b);
}

export function validatePlantings(
  seeds: readonly { id: number; growthId: number }[],
  growths: readonly {
    id: number;
    kind: "crop" | "staged";
    stages: readonly { id: number; plantId: number | null }[];
    initialStageIds?: number[];
    regrowthStageIds?: number[] | null;
    matureStages?: { stageId: number }[];
    witheredStageId?: number | null;
  }[],
  plantIds: ReadonlySet<number>,
) {
  const issues: { code: string; path: (string | number)[]; message: string }[] = [];
  const issue = (path: (string | number)[], message: string) =>
    issues.push({ code: "invalid_reference", path, message });
  const configurations = new Map(growths.map((growth) => [growth.id, growth]));
  const seenSeeds = new Set<number>();
  for (const [index, seed] of seeds.entries()) {
    if (seenSeeds.has(seed.id)) issue(["seeds", index], `Duplicate seed ${seed.id}`);
    seenSeeds.add(seed.id);
    if (seed.id !== seed.growthId || !configurations.has(seed.growthId))
      issue(["seeds", index, "growthId"], `Unknown or inconsistent growth ${seed.growthId}`);
  }
  const seenGrowths = new Set<number>();
  for (const [index, growth] of growths.entries()) {
    const path = ["growths", index];
    if (seenGrowths.has(growth.id) || !seenSeeds.has(growth.id))
      issue(path, `Duplicate or unreferenced growth ${growth.id}`);
    seenGrowths.add(growth.id);
    const stages = new Map(growth.stages.map((stage) => [stage.id, stage]));
    if (stages.size !== growth.stages.length || !stages.size)
      issue(path, "Growth stages must be nonempty and unique");
    const targets = growth.stages.flatMap((stage) =>
      stage.plantId === null ? [] : [stage.plantId],
    );
    if (!targets.length) issue(path, "Growth requires a formal plant association");
    for (const target of targets) if (!plantIds.has(target)) issue(path, `Unknown plant ${target}`);
    if (growth.kind !== "crop") continue;
    const roles = [
      ...(growth.initialStageIds ?? []),
      ...(growth.regrowthStageIds ?? []),
      ...(growth.matureStages?.map((stage) => stage.stageId) ?? []),
      ...(growth.witheredStageId == null ? [] : [growth.witheredStageId]),
    ];
    for (const id of roles) if (!stages.has(id)) issue(path, `Unknown growth stage ${id}`);
    for (const stage of growth.stages)
      if (!roles.includes(stage.id)) issue(path, `Unreferenced growth stage ${stage.id}`);
    for (const mature of growth.matureStages ?? [])
      if (stages.get(mature.stageId)?.plantId == null)
        issue(path, "Mature crop stage requires a plant");
    for (const ids of [
      growth.initialStageIds ?? [],
      growth.regrowthStageIds ?? [],
      growth.matureStages?.map((stage) => stage.stageId) ?? [],
    ])
      if (new Set(ids).size !== ids.length) issue(path, "Duplicate growth role stage");
  }
  return issues;
}
