import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import type { IngredientCategory } from "@loomix/content-schema";
import { ingredientExpressionItemIds, parseIngredientExpression } from "./recipes.ts";

const categories: IngredientCategory[] = [
  { id: 1, tagName: "食材_A", name: "A", parentId: null, itemIds: [1, 2] },
  { id: 2, tagName: "食材_B", name: "B", parentId: null, itemIds: [2, 3] },
  { id: 3, tagName: "食材_C", name: "C", parentId: null, itemIds: [3, 4] },
];
const byName = new Map(categories.map((category) => [category.tagName, category]));
const byId = new Map(categories.map((category) => [category.id, category]));

test("parses category, all, any and mixed expressions with & precedence", () => {
  assert.deepEqual(parseIngredientExpression("食材_A", byName).expression, {
    kind: "category",
    categoryId: 1,
  });
  assert.deepEqual(parseIngredientExpression("食材_A&食材_B", byName).expression, {
    kind: "all",
    terms: [
      { kind: "category", categoryId: 1 },
      { kind: "category", categoryId: 2 },
    ],
  });
  assert.deepEqual(parseIngredientExpression("食材_A|食材_B", byName).expression, {
    kind: "any",
    terms: [
      { kind: "category", categoryId: 1 },
      { kind: "category", categoryId: 2 },
    ],
  });
  assert.deepEqual(parseIngredientExpression("食材_A&食材_B|食材_C", byName).expression, {
    kind: "any",
    terms: [
      {
        kind: "all",
        terms: [
          { kind: "category", categoryId: 1 },
          { kind: "category", categoryId: 2 },
        ],
      },
      { kind: "category", categoryId: 3 },
    ],
  });
  assert.deepEqual(
    ingredientExpressionItemIds(
      parseIngredientExpression("食材_A&食材_B|食材_C", byName).expression!,
      byId,
    ),
    [2, 3, 4],
  );
});

test("rejects unknown, empty and unsupported expressions without guessing", () => {
  for (const raw of ["食材_未知", "食材_A||食材_B", "|食材_A", "食材_A&", "(食材_A)"]) {
    const result = parseIngredientExpression(raw, byName);
    assert.equal(result.expression, null, raw);
    assert.ok(result.reason, raw);
  }
});
