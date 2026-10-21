import assert from "node:assert/strict";
import { contentGroups, groupAt, parseContent } from "@loomix/content-schema";

export {
  basicFields,
  additionalFields,
  memberTargets,
  emptyContent,
  groupAt,
} from "@loomix/content-schema";

export function plainText(value) {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, "")
        .replace(/\r\n/g, "\n")
        .trim() || null
    : null;
}
export function splitTags(value) {
  return value
    ? value
        .split(/[,;，]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}
export function furnitureSize(value) {
  const match = /^尺寸_(\d+(?:a\d+)?)_(\d+(?:a\d+)?)$/.exec(value ?? "");
  return match
    ? `${Number(match[1].replace("a", ".")).toFixed(1)}x${Number(match[2].replace("a", ".")).toFixed(1)}`
    : null;
}
export function expandTags(names, nodes) {
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
export function validateModel(content, scopeIds, expected, qualities) {
  const parsed = parseContent(content);
  const all = [],
    counts = {};
  for (const group of contentGroups) {
    const rows = groupAt(parsed, group);
    counts[group] = rows.length;
    if (expected) assert.equal(rows.length, expected[group], `${group} count`);
    for (const row of rows) {
      if (row.quality !== null && qualities)
        assert.ok(qualities.has(row.quality), `${row.id} quality`);
      all.push(row);
    }
  }
  assert.deepEqual(
    new Set(all.map((row) => row.id)),
    new Set(scopeIds),
    "Exact root 93 membership",
  );
  return { all, counts };
}
