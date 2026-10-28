import { z } from "zod";
import { DifficultyConditionSchema } from "@loomix/schema/extraction";
import type { DifficultyRequirement } from "@loomix/schema/extraction";

const rawCondition = z.strictObject({
  childList: z.strictObject({
    nodeList: z
      .array(
        z.strictObject({
          leaf: z.union([
            z.strictObject({
              chefLevelGreaterOrEqual: z.strictObject({ level: z.number().int().positive() }),
            }),
            z.strictObject({
              learnCookRecipeInCategory: z.strictObject({
                categoryId: z.number().int().positive(),
              }),
            }),
          ]),
        }),
      )
      .length(1),
  }),
});

export function parseDifficultyRequirement(rawExpression: string): DifficultyRequirement {
  let input: unknown;
  try {
    input = JSON.parse(rawExpression);
  } catch {
    return { rawExpression, condition: null, unresolvedReason: "invalid_condition_json" };
  }
  const parsed = rawCondition.safeParse(input);
  if (!parsed.success)
    return { rawExpression, condition: null, unresolvedReason: "unsupported_condition_structure" };
  const { leaf } = parsed.data.childList.nodeList[0]!;
  const condition =
    "chefLevelGreaterOrEqual" in leaf
      ? { kind: "chefLevelGreaterOrEqual", ...leaf.chefLevelGreaterOrEqual }
      : { kind: "learnCookRecipeInCategory", ...leaf.learnCookRecipeInCategory };
  return {
    rawExpression,
    condition: DifficultyConditionSchema.parse(condition),
    unresolvedReason: null,
  };
}
