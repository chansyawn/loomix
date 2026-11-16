import { expect, test } from "vite-plus/test";
import { parseUnlockCondition } from "./conditions.ts";

test("解锁条件保留等级与类别引用，不臆造解锁规则", () => {
  const raw = JSON.stringify({
    childList: { nodeList: [{ leaf: { chefLevelGreaterOrEqual: { level: 5 } } }] },
  });
  expect(parseUnlockCondition(raw)).toEqual({ kind: "chefLevelGreaterOrEqual", level: 5 });
  const category = JSON.stringify({
    childList: { nodeList: [{ leaf: { learnCookRecipeInCategory: { categoryId: 4 } } }] },
  });
  expect(parseUnlockCondition(category)).toEqual({
    kind: "learnCookRecipeInCategory",
    categoryId: 4,
  });
});

test.each([
  "broken JSON",
  "{}",
  JSON.stringify({ childList: { nodeList: [{ leaf: { unknown: { level: 5 } } }] } }),
])("未知条件 %s 不会被当作已满足", (raw) => {
  expect(() => parseUnlockCondition(raw)).toThrow();
});
