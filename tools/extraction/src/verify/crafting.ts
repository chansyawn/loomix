import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../extraction/decode/tables.ts";

export function verifyCraftingRelations(catalog: Catalog, tables: Tables): void {
  const formal = new Set(catalog.records.map((record) => record.id));
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
      catalog.craftingRecipes.map((recipe) => [
        recipe.id,
        recipe.productId,
        recipe.collectionId,
        recipe.cardItemId,
      ]),
    ),
    tuples(
      expected.map((row) => [
        tables.id(row),
        tables.uint(row, 1),
        tables.uint(row, 3),
        tables.id(row),
      ]),
    ),
    "Independent crafting relationships",
  );
  assert.deepEqual(
    catalog.craftingCollections.map((collection) => collection.id),
    tables
      .rows(180)
      .map((row) => tables.id(row))
      .sort((a, b) => a - b),
    "All crafting collections exist independently of neighbors",
  );
  for (const collection of catalog.craftingCollections) {
    const row = tables.byId(180).get(collection.id)!;
    assert.equal(collection.name, tables.text(row, 1));
    assert.equal(collection.acquisitionText, tables.text(row, 3));
  }
}
