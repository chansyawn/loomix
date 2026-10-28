import type { RecordType } from "../schema.ts";
import type { TagNode } from "../types.ts";
import assert from "node:assert/strict";
import { recordTypes, recordType, parseCatalog } from "../schema.ts";

export function plainText(value: unknown) {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/\r\n/g, "\n")
        .trim() || null
    : null;
}
export function splitTags(value: string | null | undefined) {
  return value
    ? value
        .split(/[,;，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}
export function furnitureSize(value: string | null | undefined) {
  const match = /^尺寸_(\d+(?:a\d+)?)_(\d+(?:a\d+)?)$/.exec(value ?? "");
  return match
    ? `${Number(match[1].replace("a", ".")).toFixed(1)}x${Number(match[2].replace("a", ".")).toFixed(1)}`
    : null;
}
export function expandTags(names: string[], nodes: Record<number, TagNode>) {
  const byName = new Map(Object.values(nodes).map((n) => [n.TagName, n]));
  const expanded = new Set(names);
  for (const name of names) {
    let node = byName.get(name);
    const visited = new Set();
    while (node) {
      if (visited.has(node.TagId)) throw new Error(`Tag inheritance cycle: ${name}`);
      visited.add(node.TagId);
      expanded.add(node.TagName);
      node = nodes[node.ParentId];
    }
  }
  return expanded;
}
export function validateModel(
  content: unknown,
  scopeIds: Iterable<number>,
  expected?: Partial<Record<RecordType, number>> | null,
  qualities?: Set<number>,
  parse = parseCatalog,
) {
  const parsed = parse(content);
  const all = parsed.items;
  const counts: Partial<Record<RecordType, number>> = {};
  for (const group of recordTypes) {
    const rows = parsed.items.filter((record) => recordType(record) === group);
    counts[group] = rows.length;
    if (expected) assert.equal(rows.length, expected[group], `${group} count`);
    for (const row of rows) {
      if (row.quality !== null && qualities)
        assert.ok(qualities.has(row.quality), `${row.id} quality`);
    }
  }
  assert.deepEqual(
    new Set(all.map((row) => row.id)),
    new Set(scopeIds),
    "Exact confirmed catalog membership",
  );
  return { all, counts };
}
