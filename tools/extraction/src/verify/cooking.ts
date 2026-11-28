import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { ClientReadRecords } from "../extraction/model.ts";

export function verifyCookingItems(
  catalog: Catalog,
  tables: Tables,
  exclusions: ClientReadRecords["diagnostics"]["cookingItemExclusions"],
) {
  const products = new Set(
    catalog.items.filter((item) => item.kind === "dish").map((item) => item.id),
  );
  const recipes = tables.byId(122);
  const expected = new Map<number, number>();
  const excluded = new Map<number, { productId: number | null; reason: string }>();
  for (const row of tables.rows(318)) {
    if (tables.uint(row, 2) !== 300) continue;
    const id = tables.id(row);
    const recipe = recipes.get(id);
    const productId = tables.uint(recipe, 4);
    if (productId !== null && products.has(productId)) expected.set(id, productId);
    else excluded.set(id, { productId, reason: recipe ? "outside_dishes" : "no_recipe" });
  }
  const items = catalog.items.filter((item) => item.kind === "cookingRecipeItem");
  assert.deepEqual(
    new Map(items.map((item) => [item.id, item.productId])),
    expected,
    "Independent cooking recipe item products",
  );
  assert.equal(items.length, expected.size);
  assert.deepEqual(
    new Map(exclusions.map(({ id, productId, reason }) => [id, { productId, reason }])),
    excluded,
    "Independent cooking item exclusions",
  );
  assert.equal(exclusions.length, excluded.size);
  const main = tables.byId(318);
  for (const item of items) assert.equal(item.name, tables.text(main.get(item.id), 1)?.trim());
  return expected.keys();
}

export function verifyCookingRecipes(catalog: Catalog, tables: Tables): void {
  const dishes = catalog.items.flatMap((item) => (item.kind === "dish" ? [item] : []));
  const rows = new Map(
    tables
      .rows(122)
      .filter((row) => dishes.some((dish) => dish.id === tables.uint(row, 4, 0)))
      .map((row) => [tables.uint(row, 4)!, row]),
  );
  assert.deepEqual(
    dishes.filter((dish) => dish.cooking !== null).map((dish) => dish.id),
    dishes.map((dish) => dish.id).filter((id) => rows.has(id)),
    "Independent cooking products",
  );
  for (const dish of dishes) {
    const row = rows.get(dish.id);
    if (!row || !dish.cooking) continue;
    const difficulty = tables.byId(121).get(tables.uint(row, 2));
    assert.equal(dish.cooking.difficulty, tables.text(difficulty, 1));
    assert.equal(dish.cooking.unlockCondition === null, tables.string(difficulty, 2) === null);
    const taste = tables.string(row, 15);
    assert.deepEqual(dish.cooking.tastes, taste ? [...new Set(taste.split("|"))] : null);
    const cookware = tables
      .rows(126)
      .filter((entry) => tables.uint(entry, 2) === tables.uint(row, 16));
    assert.equal(
      dish.cooking.cookware,
      cookware.length === 1 ? tables.string(cookware[0], 1) : null,
    );
    assert.equal(
      dish.cooking.slots.length,
      [20, 25, 30, 35].filter((field) => tables.string(row, field) !== null).length,
      `Independent cooking expressions ${dish.id}`,
    );
  }
}
