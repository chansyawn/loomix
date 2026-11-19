import type { CraftingRecipe } from "@loomix/schema/catalog";
import type { TableRow } from "../../../types.ts";
import type { Tables } from "../../decode/tables.ts";
import { tableSource } from "../collection/evidence.ts";

type CraftingContext = { tables: Tables };

export function readCraftingRecipes(
  { tables }: CraftingContext,
  furnitureIds: ReadonlySet<number>,
) {
  const main = tables.byId(318);
  const sets = tables.byId(180);
  const recipes: (CraftingRecipe & { id: number; cardSetId: number | null; row: TableRow })[] = [];
  const audit = [];
  const recipeRows = tables.byId(568);
  for (const row of recipeRows.values()) {
    const id = tables.id(row);
    const productId = tables.uint(row, 1);
    const validCard = tables.uint(main.get(id), 2) === 19;
    const included = validCard && productId !== null && furnitureIds.has(productId);
    const source = tableSource(tables, row, [0, 1, 2, 3, 9, 12, 13, 14, 15, 16, 17, 18, 19]);
    audit.push({
      id,
      productId,
      disposition: included ? "included" : validCard ? "outside_scope" : "orphan_card",
      source,
    });
    if (!included || productId === null) continue;
    if (tables.uint(row, 2) !== 1) throw new Error(`Unsupported crafting product quantity ${id}`);
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
    const cardSetId = tables.uint(row, 3);
    if (cardSetId !== null && !sets.has(cardSetId))
      throw new Error(`Unknown crafting collection ${id}:${cardSetId}`);
    recipes.push({ id, productId, cardSetId, materials: materials.length ? materials : null, row });
  }
  for (const row of main.values()) {
    const id = tables.id(row);
    if (tables.uint(row, 2) === 19 && !recipeRows.has(id))
      audit.push({
        id,
        productId: null,
        disposition: "no_recipe",
        source: tableSource(tables, row, [0, 2]),
      });
  }
  return { recipes: recipes.sort((a, b) => a.id - b.id), audit: audit.sort((a, b) => a.id - b.id) };
}
