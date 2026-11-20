import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { SourceObservations } from "../extraction/model.ts";

export function verifyCraftingRelations(
  catalog: Catalog,
  tables: Tables,
  audit: SourceObservations["diagnostics"]["crafting"],
): void {
  const furnitureIds = new Set(
    catalog.items.filter((item) => item.kind === "furniture").map((item) => item.id),
  );
  const main = tables.byId(318);
  const recipeRows = tables.rows(568);
  const recipeIds = new Set(recipeRows.map((row) => tables.id(row)));
  const expected = recipeRows.filter(
    (row) =>
      tables.uint(main.get(tables.id(row)), 2) === 19 && furnitureIds.has(tables.uint(row, 1, 0)),
  );
  const expectedIds = new Set(expected.map((row) => tables.id(row)));
  const cards = new Map(
    catalog.items.flatMap((item) =>
      item.kind === "creationCard" ? [[item.id, item] as const] : [],
    ),
  );
  const sets = tables.byId(180);
  assert.deepEqual(
    [...cards.keys()].sort((a, b) => a - b),
    [...expectedIds].sort((a, b) => a - b),
    "Independent crafting relationships",
  );
  const dispositions = [
    ...recipeRows.map((row) => {
      const id = tables.id(row);
      const disposition = expectedIds.has(id)
        ? "included"
        : tables.uint(main.get(id), 2) === 19
          ? "outside_scope"
          : "orphan_card";
      return [id, tables.uint(row, 1), disposition];
    }),
    ...[...main.values()].flatMap((row) => {
      const id = tables.id(row);
      return tables.uint(row, 2) === 19 && !recipeIds.has(id) ? [[id, null, "no_recipe"]] : [];
    }),
  ];
  assert.ok(Array.isArray(audit));
  assert.deepEqual(
    audit
      .map(({ id, productId, disposition }) => JSON.stringify([id, productId, disposition]))
      .sort(),
    dispositions.map((row) => JSON.stringify(row)).sort(),
    "Independent crafting exclusions",
  );
  const usedSets = new Set<number>();
  for (const row of expected) {
    const card = cards.get(tables.id(row))!;
    const { recipe } = card;
    assert.equal(tables.uint(row, 2), 1, `Crafting product quantity ${card.id}`);
    assert.equal(recipe.productId, tables.uint(row, 1), `Crafting product ${card.id}`);
    assert.equal(card.cardSetId, tables.uint(row, 3), `Crafting card set ${card.id}`);
    if (card.cardSetId !== null) usedSets.add(card.cardSetId);
    const materials = [12, 14, 16, 18].flatMap((field) => {
      const itemId = tables.uint(row, field),
        quantity = tables.uint(row, field + 1);
      return itemId === null && quantity === null ? [] : [{ itemId, quantity }];
    });
    assert.deepEqual(
      recipe.materials,
      materials.length ? materials : null,
      `Independent crafting materials ${card.id}`,
    );
  }
  assert.deepEqual(
    catalog.creationCardSets.map((entry) => entry.id),
    [...usedSets].sort((a, b) => a - b),
  );
  for (const entry of catalog.creationCardSets)
    assert.equal(
      entry.name,
      tables.text(sets.get(entry.id), 1),
      `Creation card set name ${entry.id}`,
    );
}
