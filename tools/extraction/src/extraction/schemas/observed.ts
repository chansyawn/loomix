import { z } from "zod";
import { IdSchema, NullableTextSchema } from "@loomix/schema/common";
import {
  IngredientExpressionSchema,
  QualitySchema,
  TastesSchema,
  UnlockConditionSchema,
} from "@loomix/schema/catalog";

// 提取观察保留客户端原始字段与关联，发布契约只在领域组装时按需投影。
export const ObservedRecipeSlotSchema = z.strictObject({
  field: z.union([z.literal(20), z.literal(25), z.literal(30), z.literal(35)]),
  rawExpression: z.string().min(1),
  expression: IngredientExpressionSchema.nullable(),
  itemIds: IdSchema.array().nullable(),
});
export const ObservedCookingRecipeSchema = z.strictObject({
  id: IdSchema,
  productId: IdSchema,
  difficulty: NullableTextSchema,
  unlockCondition: UnlockConditionSchema.nullable(),
  cookware: NullableTextSchema,
  tastes: TastesSchema.nullable(),
  slots: ObservedRecipeSlotSchema.array().nullable(),
});
export const ObservedTradeSchema = z.strictObject({
  sellPrice: z.number().nonnegative().nullable(),
  offers: z
    .strictObject({
      id: IdSchema,
      goodsGroupId: IdSchema,
      buyPrice: z.number().nonnegative().nullable(),
      currencyItemId: IdSchema.nullable(),
      stock: z.number().nonnegative().nullable(),
      refresh: NullableTextSchema,
      conditions: z
        .strictObject({
          field: z.number().int().nonnegative(),
          kind: z.string().min(1),
          parameters: NullableTextSchema,
        })
        .array()
        .nullable(),
    })
    .array()
    .nullable(),
});
export const ObservedDropSchema = z.strictObject({
  itemId: IdSchema,
  dropGroupId: IdSchema.nullable(),
  weight: z.number().nonnegative().nullable(),
});

export function createObservedGrowthSchema<I extends z.ZodType>(image: I) {
  const base = z.strictObject({
    id: IdSchema,
    stages: z
      .strictObject({ id: IdSchema, name: z.string().min(1), image, plantId: IdSchema.nullable() })
      .array()
      .min(1),
  });
  return z.discriminatedUnion("kind", [
    base.extend({
      kind: z.literal("crop"),
      cycleMode: NullableTextSchema,
      initialStageIds: IdSchema.array().min(1),
      regrowthStageIds: IdSchema.array().nullable(),
      matureStages: z
        .strictObject({ stageId: IdSchema, tag: NullableTextSchema, rank: NullableTextSchema })
        .array()
        .min(1),
      witheredStageId: IdSchema.nullable(),
      harvestCount: IdSchema.nullable(),
    }),
    base.extend({ kind: z.literal("staged") }),
  ]);
}
export function createObservedSeedSchema<I extends z.ZodType>(image: I) {
  return z.strictObject({
    id: IdSchema,
    name: z.string().min(1),
    image,
    description: NullableTextSchema,
    quality: QualitySchema.nullable(),
    growthId: IdSchema,
    trade: ObservedTradeSchema.nullable(),
  });
}

export type ObservedRecipeSlot = z.infer<typeof ObservedRecipeSlotSchema>;
export type ObservedCookingRecipe = z.infer<typeof ObservedCookingRecipeSchema>;
export type ObservedDrop = z.infer<typeof ObservedDropSchema>;

type PlantingGrowth = {
  id: number;
  kind: "crop" | "staged";
  stages: readonly { id: number; plantId: number | null }[];
  initialStageIds?: number[];
  regrowthStageIds?: number[] | null;
  matureStages?: { stageId: number }[];
  witheredStageId?: number | null;
};

// 种子与生长配置在观察层仍按客户端表分开存放，此处校验二者一一对应。
export function validatePlantings(
  seeds: readonly { id: number; growthId: number }[],
  growths: readonly PlantingGrowth[],
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
      growth.initialStageIds ?? [],
      growth.regrowthStageIds ?? [],
      growth.matureStages?.map((stage) => stage.stageId) ?? [],
    ];
    const referenced = [
      ...roles.flat(),
      ...(growth.witheredStageId == null ? [] : [growth.witheredStageId]),
    ];
    for (const id of referenced) if (!stages.has(id)) issue(path, `Unknown growth stage ${id}`);
    for (const stage of growth.stages)
      if (!referenced.includes(stage.id)) issue(path, `Unreferenced growth stage ${stage.id}`);
    for (const mature of growth.matureStages ?? [])
      if (stages.get(mature.stageId)?.plantId == null)
        issue(path, "Mature crop stage requires a plant");
    for (const ids of roles)
      if (new Set(ids).size !== ids.length) issue(path, "Duplicate growth role stage");
  }
  return issues;
}
