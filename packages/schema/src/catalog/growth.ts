import { z } from "zod";
import { IdSchema, NullableTextSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";

const stage = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  image: ImageRefSchema.nullable(),
  plantId: IdSchema.nullable(),
});
const stages = stage.array().min(1);

export const GrowthSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("crop"),
    stages,
    initialStageIds: IdSchema.array().min(1),
    regrowthStageIds: IdSchema.array(),
    matureStages: z
      .strictObject({ stageId: IdSchema, tag: NullableTextSchema, rank: NullableTextSchema })
      .array()
      .min(1),
    witheredStageId: IdSchema.nullable(),
    harvestCount: IdSchema.nullable(),
  }),
  z.strictObject({ kind: z.literal("staged"), stages }),
]);
export type Growth = z.infer<typeof GrowthSchema>;
export type GrowthStage = Growth["stages"][number];

export function growthPlantIds(growth: {
  stages: readonly { plantId: number | null }[];
}): number[] {
  return [
    ...new Set(growth.stages.flatMap((stage) => (stage.plantId === null ? [] : [stage.plantId]))),
  ].sort((a, b) => a - b);
}

export function growthRoleStageIds(growth: Growth): number[][] {
  if (growth.kind === "staged") return [];
  return [
    growth.initialStageIds,
    growth.regrowthStageIds,
    growth.matureStages.map((stage) => stage.stageId),
    growth.witheredStageId === null ? [] : [growth.witheredStageId],
  ];
}

// 仅校验生长配置自身的结构；产物是否为正式植物由目录校验负责。
export function validateGrowth(growth: Growth): string[] {
  const issues: string[] = [];
  const stageIds = new Set(growth.stages.map((stage) => stage.id));
  if (stageIds.size !== growth.stages.length) issues.push("Growth stages must be unique");
  if (!growth.stages.some((stage) => stage.plantId !== null))
    issues.push("Growth requires a formal plant association");
  if (growth.kind === "staged") return issues;
  const roles = growthRoleStageIds(growth);
  const referenced = new Set(roles.flat());
  for (const id of referenced) if (!stageIds.has(id)) issues.push(`Unknown growth stage ${id}`);
  for (const stage of growth.stages)
    if (!referenced.has(stage.id)) issues.push(`Unreferenced growth stage ${stage.id}`);
  for (const ids of roles.slice(0, 3))
    if (new Set(ids).size !== ids.length) issues.push("Duplicate growth role stage");
  const plants = new Map(growth.stages.map((stage) => [stage.id, stage.plantId]));
  for (const mature of growth.matureStages)
    if (plants.get(mature.stageId) == null) issues.push("Mature crop stage requires a plant");
  return issues;
}
