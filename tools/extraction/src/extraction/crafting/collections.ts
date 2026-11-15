import type { Catalog } from "@loomix/schema/catalog";
import type { Tables } from "../decode/tables.ts";

export function readCraftingCollections(tables: Tables): Catalog["craftingCollections"] {
  return [...tables.byId(180).values()]
    .map((row) => {
      const name = tables.text(row, 1);
      if (!name) throw new Error(`Missing crafting collection name ${tables.id(row)}`);
      return { id: tables.id(row), name, acquisitionText: tables.text(row, 3) };
    })
    .sort((a, b) => a.id - b.id);
}
