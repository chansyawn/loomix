import type { ContentContext } from "../../content/context.ts";
import type { CollectionDetail } from "../../schema.ts";
import { tableSource } from "../evidence.ts";
import type { DetailResult } from "./client.ts";

export function treeDrops(
  context: ContentContext,
  id: number,
): DetailResult<CollectionDetail["treeDrops"]> {
  const { tables } = context;
  const tree = tables.byId(708).get(id);
  if (!tree) return { value: null, sources: [], reason: "no_tree_configuration" };
  const sources = [tableSource(tables, tree, [0, 1, 2, 3, 5])];
  const groupId = tables.uint(tree, 5);
  const rows = groupId === null ? [] : tables.rows(563).filter((row) => tables.id(row) === groupId);
  if (groupId !== null && !rows.length) throw new Error(`Missing tree drop group ${id}:${groupId}`);
  const weights = rows.map((row) => {
    const weight = tables.uint(row, 5);
    if (weight === null || !Number.isSafeInteger(weight) || weight < 0)
      throw new Error(`Invalid tree drop weight ${id}:${row.rowOffset}`);
    return weight;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isSafeInteger(totalWeight)) throw new Error(`Invalid tree drop total ${id}`);
  const weighted = rows.every((row) => tables.uint(row, 1) === 2) && totalWeight > 0;
  const value: NonNullable<CollectionDetail["treeDrops"]> = [];
  const fruitId = tables.uint(tree, 1);
  if (fruitId !== null) {
    if (!context.main.has(fruitId)) throw new Error(`Unresolved tree fruit ${id}:${fruitId}`);
    value.push({
      itemId: fruitId,
      dropGroupId: null,
      weight: null,
      quantityMin: null,
      quantityMax: null,
      probability: null,
    });
  }
  for (const [index, row] of rows.entries()) {
    const itemId = tables.uint(row, 2);
    if (!itemId || !context.main.has(itemId))
      throw new Error(`Unresolved tree drop item ${id}:${itemId}`);
    sources.push(tableSource(tables, row, [0, 1, 2, 3, 4, 5, 15]));
    const weight = weights[index]!;
    value.push({
      itemId,
      dropGroupId: groupId,
      weight,
      quantityMin: null,
      quantityMax: null,
      probability: null,
    });
  }
  return {
    value: value.length ? value : null,
    sources,
    reason: weighted
      ? "fruit_probability_quantity_and_drop_runtime_rules_unconfirmed"
      : "drop_mode_or_positive_total_weight_unconfirmed",
  };
}
