import type { Catalog } from "@loomix/schema/extraction";
import type { CraftingRecipe } from "@loomix/schema/extraction";
import type { Tables } from "../decode/tables.ts";
import { profile } from "../../profile.ts";
import { tableSource } from "./evidence.ts";
import type { CollectionSource } from "./evidence.ts";

export function readCraftingRecipes(
  tables: Pick<Tables, "rows" | "uint" | "id">,
  catalog: Catalog,
) {
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const byProduct = new Map<number, { recipes: CraftingRecipe[]; sources: CollectionSource[] }>();
  const ids = new Set<number>();
  const audit = [];
  for (const row of tables.rows(profile.roots.craftingRecipes)) {
    const id = tables.id(row);
    if (ids.has(id)) throw new Error(`Duplicate crafting recipe ${id}`);
    ids.add(id);
    const productId = tables.uint(row, 1);
    if (productId === null) throw new Error(`Missing crafting product ${id}`);
    const product = items.get(productId);
    const fields = [0, 1, 12, 13, 14, 15, 16, 17, 18, 19];
    const materials: NonNullable<CraftingRecipe["materials"]> = [];
    for (const field of [12, 14, 16, 18]) {
      const itemId = tables.uint(row, field);
      const quantity = tables.uint(row, field + 1);
      if (itemId === null && quantity === null) continue;
      if (itemId === null || quantity === null || itemId <= 0 || quantity <= 0)
        throw new Error(`Incomplete/invalid crafting material pair ${id}.${field}`);
      if (materials.some((material) => material.itemId === itemId))
        throw new Error(`Duplicate crafting material ${id}/${itemId}`);
      if (
        product?.category === "furniture" &&
        product.kind === "item" &&
        items.get(itemId)?.kind !== "item"
      )
        throw new Error(`Unadmitted crafting material ${id}/${itemId}`);
      materials.push({ itemId, quantity });
    }
    const source = tableSource(tables, row, fields);
    const included = product?.category === "furniture" && product.kind === "item";
    const recipe = {
      id,
      materials: materials.length ? materials : null,
      unresolvedReason: materials.length ? null : "material_slots_absent_semantics_unconfirmed",
    };
    audit.push({
      id,
      productId,
      materials: recipe.materials,
      unresolvedReason: recipe.unresolvedReason,
      source,
      disposition: included ? "included" : "outside_scope",
    });
    if (!included) continue;
    const entry = byProduct.get(productId) ?? { recipes: [], sources: [] };
    entry.recipes.push(recipe);
    entry.sources.push(source);
    byProduct.set(productId, entry);
  }
  for (const entry of byProduct.values()) entry.recipes.sort((a, b) => a.id - b.id);
  return { byProduct, audit };
}
