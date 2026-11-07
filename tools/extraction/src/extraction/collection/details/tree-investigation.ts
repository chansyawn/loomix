import type { Tables } from "../../decode/tables.ts";
import { tableSource } from "../evidence.ts";

export function treeInvestigation(tables: Tables) {
  const rules = tables.rows(327);
  return tables.rows(708).map((tree) => {
    const groupId = tables.uint(tree, 5);
    const rewards =
      groupId === null ? [] : tables.rows(563).filter((row) => tables.id(row) === groupId);
    const weights = rewards.map((row) => tables.uint(row, 5));
    return {
      id: tables.id(tree),
      field: "detail.treeDrops",
      status: "unconfirmed" as const,
      reason: "fruit_count_weights_and_drop_runtime_rules_need_independent_confirmation",
      candidates: {
        fruitId: tables.uint(tree, 1),
        fruitCountCandidate: tables.uint(tree, 2),
        fruitWeights: tables.string(tree, 3),
        dropGroupId: groupId,
        totalWeight: weights.every((weight) => weight !== null)
          ? weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)
          : null,
        rewards: rewards.map((row) => ({
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
        tableSource(tables, tree, [0, 1, 2, 3, 5]),
        ...rewards.map((row) => tableSource(tables, row, [0, 1, 2, 3, 4, 5, 15])),
        ...rules.map((row) => tableSource(tables, row, [0, 1, 2])),
      ],
    };
  });
}
