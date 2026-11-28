import assert from "node:assert/strict";
import type { Catalog } from "@loomix/schema/catalog";
import type { ClientIconRecords, ClientIconSlot } from "../extraction/client-icons/model.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";

function checkKeys(actual: readonly number[], expected: readonly number[], label: string) {
  assert.equal(new Set(actual).size, actual.length, `Duplicate ${label} key`);
  assert.deepEqual(
    actual,
    [...expected].sort((left, right) => left - right),
    label,
  );
}

export function verifyClientIconSources(
  records: ClientIconRecords,
  catalog: Catalog,
  tables: Tables,
) {
  const verifySlot = (slot: ClientIconSlot, row: TableRow, field: number) => {
    assert.deepEqual([slot.table, slot.rowOffset, slot.field], [row.root, row.rowOffset, field]);
    assert.equal(slot.image?.reference ?? null, tables.string(row, field) || null);
  };
  const dishes = catalog.items.filter((item) => item.kind === "dish");
  const recipes = tables.byId(122);
  const tools = tables.byId(126);
  const difficulties = tables.byId(121);
  checkKeys(
    records.dishes.map((dish) => dish.id),
    dishes.filter((dish) => dish.cooking).map((dish) => dish.id),
    "dish icons",
  );
  const effectIds = new Set<number>();
  const cookwareIds = new Set<number>();
  for (const dish of records.dishes) {
    const recipe = recipes.get(dish.recipeId);
    assert.ok(recipe && tables.uint(recipe, 4) === dish.id);
    const item = dishes.find((entry) => entry.id === dish.id);
    const configuredEffects = tables.string(recipe, 6);
    assert.deepEqual(
      dish.effectIds,
      configuredEffects ? configuredEffects.split(/[,;]/).map(Number) : [],
    );
    assert.deepEqual(dish.effectIds, item?.effects?.map((effect) => effect.effectId) ?? []);
    for (const id of dish.effectIds) effectIds.add(id);
    assert.equal(dish.difficultyId, tables.uint(recipe, 2));
    assert.ok(dish.difficultyId === null || difficulties.has(dish.difficultyId));
    const tool = [...tools.values()].filter(
      (row) => tables.uint(row, 2) !== null && tables.uint(row, 2) === tables.uint(recipe, 16),
    );
    assert.ok(tool.length <= 1);
    assert.equal(dish.cookwareId, tool[0] ? tables.id(tool[0]) : null);
    if (dish.cookwareId !== null) cookwareIds.add(dish.cookwareId);
  }
  const verifyEntries = (
    entries: ClientIconRecords["effects"],
    root: number,
    nameField: number,
    field: number,
    ids?: number[],
  ) => {
    const rows = tables.byId(root);
    checkKeys(
      entries.map((entry) => entry.id),
      ids ?? [...rows.values()].map((row) => tables.id(row)),
      `client icon table ${root}`,
    );
    for (const entry of entries) {
      const row = rows.get(entry.id);
      assert.ok(row);
      assert.equal(entry.name, tables.text(row, nameField));
      verifySlot(entry.icon, row, field);
    }
  };
  verifyEntries(records.effects, 70, 1, 18, [...effectIds]);
  verifyEntries(records.difficulties, 121, 1, 6);
  verifyEntries(records.habits, 134, 1, 2);
  verifyEntries(records.giftPreferences, 337, 2, 1, [1, 2, 4]);
  verifyEntries(records.clothingParts, 86, 1, 4);
  checkKeys(
    records.cookware.map((entry) => entry.id),
    [...cookwareIds],
    "cookware",
  );
  for (const entry of records.cookware) {
    const display = tables.rows(325).find((row) => tables.uint(row, 0) === entry.id);
    assert.ok(display);
    assert.equal(entry.name, tables.string(tools.get(entry.id), 1));
    verifySlot(entry.icon, display, 4);
  }
  const tabs = tables.rows(33);
  const keys = records.omnidexTabs.map((tab) => `${tab.groupId}/${tab.id}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(
    keys.sort(),
    tabs.map((row) => `${tables.id(row)}/${tables.uint(row, 3)}`).sort(),
  );
  for (const tab of records.omnidexTabs) {
    const row = tabs.find(
      (row) => tables.id(row) === tab.groupId && tables.uint(row, 3) === tab.id,
    );
    assert.ok(row);
    assert.equal(tab.name, tables.text(row, 4));
    assert.equal(tab.groupName, tables.text(row, 2));
    verifySlot(tab.icon, row, 9);
  }
  const furniture = tables.byId(265);
  checkKeys(
    records.furnitureCategories.map((entry) => entry.id),
    [...furniture.values()].map((row) => tables.id(row)),
    "furniture",
  );
  for (const entry of records.furnitureCategories) {
    const row = furniture.get(entry.id);
    assert.ok(row);
    assert.deepEqual(
      [entry.category, entry.subcategory, entry.name],
      [tables.text(row, 2), tables.text(row, 4), tables.string(row, 5)],
    );
    verifySlot(entry.categoryIcon, row, 6);
    verifySlot(entry.subcategoryIcon, row, 7);
  }
}
