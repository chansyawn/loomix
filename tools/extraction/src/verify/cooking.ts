import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../extraction/decode/tables.ts";

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
