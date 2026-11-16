import { z } from "zod";
import { UnlockConditionSchema } from "../../../schema.ts";
import type { UnlockCondition } from "../../../schema.ts";

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

// 未知条件结构不能视为无条件，直接中止提取以便重新确认解析规则。
export function parseUnlockCondition(rawExpression: string): UnlockCondition {
  let input: unknown;
  try {
    input = JSON.parse(rawExpression);
  } catch (cause) {
    throw new Error(`Invalid unlock condition JSON: ${rawExpression}`, { cause });
  }
  const parsed = rawCondition.safeParse(input);
  if (!parsed.success) throw new Error(`Unsupported unlock condition: ${rawExpression}`);
  const { leaf } = parsed.data.childList.nodeList[0]!;
  return UnlockConditionSchema.parse(
    "chefLevelGreaterOrEqual" in leaf
      ? { kind: "chefLevelGreaterOrEqual", ...leaf.chefLevelGreaterOrEqual }
      : { kind: "learnCookRecipeInCategory", ...leaf.learnCookRecipeInCategory },
  );
}
