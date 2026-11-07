import assert from "node:assert/strict";
import type { CollectionDetail } from "../extraction/schema.ts";
import type { Tables } from "../extraction/decode/tables.ts";
import type { detailInvestigationSchema } from "../extraction/collection/details/investigation.ts";
import type { z } from "zod";

export function verifyTreeDrops(
  tables: Tables,
  id: number,
  actual: CollectionDetail["treeDrops"],
): void {
  const tree = tables.rows(708).find((row) => tables.id(row) === id);
  if (!tree) {
    assert.equal(actual, null, `Unexpected tree drops ${id}`);
    return;
  }
  const expected: NonNullable<CollectionDetail["treeDrops"]> = [];
  const fruit = tables.uint(tree, 1);
  const group = tables.uint(tree, 5);
  const rewards = tables.rows(563).filter((row) => group !== null && tables.id(row) === group);
  assert.ok(group === null || rewards.length > 0, `Missing tree reward group ${id}`);
  const mainIds = new Set(tables.rows(318).map((row) => tables.id(row)));
  if (fruit !== null) {
    assert.ok(mainIds.has(fruit), `Missing tree fruit ${id}:${fruit}`);
    expected.push({
      itemId: fruit,
      dropGroupId: null,
      weight: null,
      quantityMin: null,
      quantityMax: null,
      probability: null,
    });
  }
  let total = 0;
  let supported = true;
  for (const row of rewards) {
    const weight = tables.uint(row, 5);
    assert.ok(weight !== null && Number.isSafeInteger(weight) && weight >= 0);
    total += weight;
    supported &&= tables.uint(row, 1) === 2;
  }
  assert.ok(Number.isSafeInteger(total));
  for (const row of rewards) {
    const itemId = tables.uint(row, 2);
    assert.ok(itemId !== null && mainIds.has(itemId), `Missing tree reward ${id}:${itemId}`);
    const weight = tables.uint(row, 5)!;
    expected.push({
      itemId,
      dropGroupId: group,
      weight,
      quantityMin: null,
      quantityMax: null,
      probability: supported && total > 0 ? weight / total : null,
    });
  }
  assert.deepEqual(actual, expected.length ? expected : null, `Independent tree drops ${id}`);
  if (supported && total > 0) {
    const sum = actual!.reduce((value, drop) => value + (drop.probability ?? 0), 0);
    assert.ok(Math.abs(sum - 1) < 1e-12, `Tree probability sum ${id}`);
  }
}

export function verifyTreeInvestigation(
  tables: Tables,
  records: z.infer<typeof detailInvestigationSchema>["records"],
): void {
  const actual = records.filter((record) => record.field === "detail.treeDrops");
  const expected = tables.rows(708).map((tree) => {
    const dropGroupId = tables.uint(tree, 5);
    const rows = tables
      .rows(563)
      .filter((row) => dropGroupId !== null && tables.id(row) === dropGroupId);
    const weights = rows.map((row) => tables.uint(row, 5));
    const rules = tables.rows(327);
    const source = (row: (typeof rows)[number], fields: number[]) => ({
      file: "prepared/ed.obb",
      table: row.root,
      row: tables.id(row),
      rowOffset: row.rowOffset,
      fields,
    });
    return {
      id: tables.id(tree),
      field: "detail.treeDrops",
      status: "unconfirmed",
      reason: "fruit_count_weights_and_drop_runtime_rules_need_independent_confirmation",
      candidates: {
        fruitId: tables.uint(tree, 1),
        fruitCountCandidate: tables.uint(tree, 2),
        fruitWeights: tables.string(tree, 3),
        dropGroupId,
        totalWeight: weights.includes(null)
          ? null
          : weights.reduce<number>((sum, weight) => sum + weight!, 0),
        rewards: rows.map((row) => ({
          rowOffset: row.rowOffset,
          mode: tables.uint(row, 1),
          itemId: tables.uint(row, 2),
          quantityCandidate: tables.uint(row, 4),
          weight: tables.uint(row, 5),
          extraRuleCode: tables.uint(row, 15),
        })),
        ruleTable327Candidates: rules.map((row) => ({
          id: tables.id(row),
          fields: [tables.uint(row, 1), tables.uint(row, 2)],
        })),
      },
      sources: [
        source(tree, [0, 1, 2, 3, 5]),
        ...rows.map((row) => source(row, [0, 1, 2, 3, 4, 5, 15])),
        ...rules.map((row) => source(row, [0, 1, 2])),
      ],
    };
  });
  assert.deepEqual(actual, expected, "Independent tree investigation including exclusions");
}
