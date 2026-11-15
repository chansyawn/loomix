import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../extraction/decode/tables.ts";

export function verifyCookingRecipes(catalog: Catalog, tables: Tables): void {
  const dishes = new Set(
    catalog.records.filter((record) => record.kind === "dish").map((record) => record.id),
  );
  const expected = tables.rows(122).filter((row) => dishes.has(tables.uint(row, 4, 0)));
  const tuples = (values: number[][]) => values.map((value) => JSON.stringify(value)).sort();
  assert.deepEqual(
    tuples(catalog.cookingRecipes.map((recipe) => [recipe.id, recipe.productId])),
    tuples(expected.map((row) => [tables.id(row), tables.uint(row, 4)!])),
    "Independent cooking identities and products",
  );
  for (const recipe of catalog.cookingRecipes) {
    const row = expected.find((entry) => tables.id(entry) === recipe.id)!;
    const difficulty = tables.byId(121).get(tables.uint(row, 2));
    assert.equal(recipe.difficulty, tables.text(difficulty, 1));
    assert.equal(
      recipe.recipeItemId,
      null,
      "Unconfirmed recipe item key must not become a relationship",
    );
    const taste = tables.string(row, 15);
    assert.deepEqual(recipe.tastes, taste ? [...new Set(taste.split("|"))] : null);
    assert.equal(recipe.difficultyRequirement?.rawExpression ?? null, tables.string(difficulty, 2));
    const cookware = tables
      .rows(126)
      .filter((entry) => tables.uint(entry, 2) === tables.uint(row, 16));
    assert.deepEqual(
      recipe.cookware,
      cookware.length === 1 ? [tables.string(cookware[0], 1)] : null,
    );
    assert.deepEqual(
      recipe.slots?.map((slot) => [slot.field, slot.rawExpression, slot.quantity]) ?? [],
      [20, 25, 30, 35].flatMap((field) => {
        const raw = tables.string(row, field);
        return raw === null ? [] : [[field, raw, null]];
      }),
      `Independent cooking expressions ${recipe.id}`,
    );
  }
}
