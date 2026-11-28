import type { Tables } from "../source/decode/tables.ts";
import { recipeEffectIds } from "../source/catalog/effect-ids.ts";
import type { TableRow } from "../types.ts";
import type { ClientIconImage, ClientIconRecords, ClientIconSlot } from "./model.ts";

export function readClientIcons(
  tables: Tables,
  recipesByProduct: ReadonlyMap<number, TableRow>,
  resolve: (reference: string) => ClientIconImage,
): ClientIconRecords {
  const ordered = (root: number) =>
    [...tables.rows(root)].sort((left, right) => tables.id(left) - tables.id(right));
  const slot = (row: TableRow, field: number): ClientIconSlot => {
    const reference = tables.string(row, field);
    try {
      return {
        table: row.root,
        rowOffset: row.rowOffset,
        field,
        image: reference ? resolve(reference) : null,
      };
    } catch (error) {
      throw new Error(
        `Client icon ${row.root}:${tables.id(row)}@${row.rowOffset}.${field} ${reference}: ${String(error)}`,
        { cause: error },
      );
    }
  };
  const entry = (row: TableRow, nameField: number, iconField: number) => ({
    id: tables.id(row),
    name: tables.text(row, nameField),
    icon: slot(row, iconField),
  });
  const cookware = ordered(126);
  const dishes = [...recipesByProduct]
    .sort(([left], [right]) => left - right)
    .map(([id, recipe]) => {
      const code = tables.uint(recipe, 16);
      const candidates = cookware.filter((row) => code !== null && tables.uint(row, 2) === code);
      if (candidates.length > 1) throw new Error(`Ambiguous cookware for dish ${id}`);
      return {
        id,
        recipeId: tables.id(recipe),
        effectIds: recipeEffectIds(tables.string(recipe, 6), id),
        cookwareId: candidates[0] ? tables.id(candidates[0]) : null,
        difficultyId: tables.uint(recipe, 2),
      };
    });
  const effectIds = new Set(dishes.flatMap((dish) => dish.effectIds));
  const cookwareIds = new Set(dishes.map((dish) => dish.cookwareId));
  const displays = tables.byId(
    325,
    (row) => tables.string(row, 4),
    new Set(cookware.map((row) => tables.id(row))),
  );
  return {
    effects: ordered(70)
      .filter((row) => effectIds.has(tables.id(row)))
      .map((row) => entry(row, 1, 18)),
    cookware: cookware
      .filter((row) => cookwareIds.has(tables.id(row)))
      .map((row) => {
        const id = tables.id(row);
        const display = displays.get(id);
        if (!display) throw new Error(`Missing cookware display ${id}`);
        return { id, name: tables.string(row, 1), icon: slot(display, 4) };
      }),
    difficulties: ordered(121).map((row) => entry(row, 1, 6)),
    habits: ordered(134).map((row) => entry(row, 1, 2)),
    giftPreferences: ordered(337)
      .filter((row) => [1, 2, 4].includes(tables.id(row)))
      .map((row) => entry(row, 2, 1)),
    omnidexTabs: ordered(33)
      .map((row) => ({
        ...entry(row, 4, 9),
        groupId: tables.id(row),
        groupName: tables.text(row, 2),
        id: tables.uint(row, 3)!,
      }))
      .sort((left, right) => left.groupId - right.groupId || left.id - right.id),
    furnitureCategories: ordered(265).map((row) => ({
      id: tables.id(row),
      category: tables.text(row, 2),
      subcategory: tables.text(row, 4),
      name: tables.string(row, 5),
      categoryIcon: slot(row, 6),
      subcategoryIcon: slot(row, 7),
    })),
    clothingParts: ordered(86).map((row) => entry(row, 1, 4)),
    dishes,
  };
}
