import type { RecordType } from "../schema.ts";
import type { GameplayTagIndex } from "@loomix/schema/gameplay-tags";
import assert from "node:assert/strict";
import { recordTypes, recordType, parseCatalog } from "../schema.ts";

export const creatureSizeUnit = "厘";

export function scaledCreatureSize(
  min: number | null,
  max: number | null,
  multiplier: number | null,
) {
  if (min === null || max === null || multiplier === null) return null;
  if (min > max) throw new Error("Creature minimum size must not exceed maximum");
  if (!Number.isFinite(multiplier) || multiplier <= 0)
    throw new Error("Creature size multiplier must be positive");

  const normalizedMultiplier = Math.round(multiplier * 100) / 100;
  if (Math.abs(multiplier - normalizedMultiplier) > 0.00001)
    throw new Error("Creature size multiplier exceeds two decimal places");
  const scale = (endpoint: number) => Math.round(endpoint * normalizedMultiplier * 100) / 100;
  return {
    min: scale(min),
    max: scale(max),
    unit: creatureSizeUnit,
  };
}

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
export function creatureSizeRange(
  min: number | null,
  max: number | null,
  multiplier: number | null,
) {
  const size = scaledCreatureSize(min, max, multiplier);
  return size ? `${size.min}–${size.max}${size.unit}` : null;
}
export function expandTags(names: string[], index: GameplayTagIndex) {
  const expanded = new Set(names);
  for (const name of names) {
    const tag = index.findByName(name);
    if (tag) for (const ancestor of index.ancestors(tag.id)) expanded.add(ancestor.internalName);
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
