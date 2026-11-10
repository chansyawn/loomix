import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../decode/tables.ts";
import { tableSource } from "../collection/evidence.ts";

type CraftingContext = { tables: Tables };

export function readCraftingRecipes({ tables }: CraftingContext, admittedIds: ReadonlySet<number>) {
  const main = tables.byId(318);
  const recipes: Catalog["craftingRecipes"] = [];
  const audit = [];
  const proofs = [];
  for (const row of tables.rows(568)) {
    const id = tables.id(row);
    const productId = tables.uint(row, 1);
    const validCard = tables.uint(main.get(id), 2) === 19;
    const included = validCard && productId !== null && admittedIds.has(productId);
    const source = tableSource(tables, row, [0, 1, 2, 12, 13, 14, 15, 16, 17, 18, 19]);
    audit.push({
      id,
      productId,
      disposition: included ? "included" : validCard ? "outside_scope" : "orphan_card",
      source,
    });
    if (!included || productId === null) continue;
    const materials = [12, 14, 16, 18].flatMap((field) => {
      const itemId = tables.uint(row, field),
        quantity = tables.uint(row, field + 1);
      if (itemId === null && quantity === null) return [];
      if (!itemId || !quantity || !main.has(itemId))
        throw new Error(`Invalid crafting material ${id}.${field}`);
      return [{ itemId, quantity }];
    });
    if (new Set(materials.map((material) => material.itemId)).size !== materials.length)
      throw new Error(`Duplicate crafting material ${id}`);
    recipes.push({
      id,
      productId,
      quantity: tables.uint(row, 2),
      materials: materials.length ? materials : null,
      unresolvedReason: materials.length ? null : "material_slots_absent_semantics_unconfirmed",
    });
    proofs.push({ id, sources: [source] });
  }
  return { recipes: recipes.sort((a, b) => a.id - b.id), audit, proofs };
}
