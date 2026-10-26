import { expect, test } from "vite-plus/test";
import { parseDifficultyRequirement } from "./conditions.ts";

test("difficulty conditions retain source JSON and category references without inventing unlock rules", () => {
  const raw = JSON.stringify({
    childList: { nodeList: [{ leaf: { chefLevelGreaterOrEqual: { level: 5 } } }] },
  });
  expect(parseDifficultyRequirement(raw)).toEqual({
    rawExpression: raw,
    condition: { kind: "chefLevelGreaterOrEqual", level: 5 },
    unresolvedReason: null,
  });
  const category = JSON.stringify({
    childList: { nodeList: [{ leaf: { learnCookRecipeInCategory: { categoryId: 4 } } }] },
  });
  expect(parseDifficultyRequirement(category).condition).toEqual({
    kind: "learnCookRecipeInCategory",
    categoryId: 4,
  });
});

test.each([
  "broken JSON",
  "{}",
  JSON.stringify({ childList: { nodeList: [{ leaf: { unknown: { level: 5 } } }] } }),
])("unknown condition %s is not treated as satisfied", (raw) => {
  const result = parseDifficultyRequirement(raw);
  expect(result.condition).toBeNull();
  expect(result.unresolvedReason).toBeTruthy();
  expect(result.rawExpression).toBe(raw);
});
