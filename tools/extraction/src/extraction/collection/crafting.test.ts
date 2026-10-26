import { expect, test } from "vite-plus/test";
import { emptyCatalog, recordSchemas } from "@loomix/content-schema";
import type { Row } from "../types.ts";
import { catalogSource } from "../../profile.ts";
import { readCraftingRecipes } from "./crafting.ts";

function fixture() {
  const catalog = emptyCatalog(catalogSource);
  const base = {
    name: "fixture",
    image: null,
    description: null,
    quality: 0,
    encyclopediaEntry: null,
    subcategory: null,
  };
  catalog.items.push(
    recordSchemas["miscellaneous.item"].parse({
      ...base,
      id: 30136,
      category: "miscellaneous",
      kind: "item",
      attributes: {},
    }),
  );
  catalog.items.push(
    recordSchemas["furniture.item"].parse({
      ...base,
      id: 1101,
      category: "furniture",
      kind: "item",
      attributes: { type: null, size: null, colors: null, materials: null, sources: null },
    }),
  );
  const cells = new Map<number, number>([
    [0, 111101],
    [1, 1101],
    [12, 30136],
    [13, 5],
  ]);
  function uint(_row: Row, field: number, fallback: number): number;
  function uint(_row: Row, field: number, fallback?: null): number | null;
  function uint(_row: Row, field: number, fallback: number | null = null): number | null {
    return cells.get(field) ?? fallback;
  }
  const tables = {
    rows: () => [{ root: 568, rowOffset: 100 }],
    id: () => 111101,
    uint,
  };
  return { catalog, cells, tables, run: () => readCraftingRecipes(tables, catalog) };
}

test("crafting pairs material IDs with positive quantities and retains source coordinates", () => {
  const result = fixture().run();
  expect(result.byProduct.get(1101)?.recipes).toEqual([
    { id: 111101, materials: [{ itemId: 30136, quantity: 5 }], unresolvedReason: null },
  ]);
  expect(result.audit[0].source).toMatchObject({
    table: 568,
    rowOffset: 100,
    fields: [0, 1, 12, 13, 14, 15, 16, 17, 18, 19],
  });
});

test.each(["missingQuantity", "zeroQuantity", "outsideMaterial", "duplicateMaterial"])(
  "crafting rejects %s",
  (kind) => {
    const f = fixture();
    if (kind === "missingQuantity") f.cells.delete(13);
    if (kind === "zeroQuantity") f.cells.set(13, 0);
    if (kind === "outsideMaterial") f.cells.set(12, 999);
    if (kind === "duplicateMaterial") {
      f.cells.set(14, 30136);
      f.cells.set(15, 2);
    }
    expect(f.run).toThrow();
  },
);

test("outside-scope products stay in the audit and never become furniture recipes", () => {
  const f = fixture();
  f.cells.set(1, 999);
  expect(f.run().byProduct.size).toBe(0);
  expect(f.run().audit[0].disposition).toBe("outside_scope");
});

test("a recipe row without material slots remains unknown rather than free to craft", () => {
  const f = fixture();
  f.cells.delete(12);
  f.cells.delete(13);
  expect(f.run().byProduct.get(1101)?.recipes).toEqual([
    {
      id: 111101,
      materials: null,
      unresolvedReason: "material_slots_absent_semantics_unconfirmed",
    },
  ]);
});
