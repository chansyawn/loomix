import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../extraction/decode/tables.ts";

export function verifyCraftingRelations(catalog: Catalog, tables: Tables): void {
  const formal = new Set([...catalog.items, ...catalog.collections].map((entry) => entry.id));
  const main = tables.byId(318);
  const expected = tables
    .rows(568)
    .filter(
      (row) =>
        tables.uint(main.get(tables.id(row)), 2) === 19 && formal.has(tables.uint(row, 1, 0)),
    );
  const tuples = (values: readonly (readonly (number | null)[])[]) =>
    values.map((value) => JSON.stringify(value)).sort();
  assert.deepEqual(
    tuples(
      catalog.items.flatMap((item) =>
        item.kind === "furniture" ? item.craftingRecipes.map((recipe) => [recipe.id, item.id]) : [],
      ),
    ),
    tuples(expected.map((row) => [tables.id(row), tables.uint(row, 1)])),
    "Independent crafting relationships",
  );
}
