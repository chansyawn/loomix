import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../types.ts";

export type FieldKind = "uint" | "float" | "text" | "string" | "vector";
export type Layout = Readonly<Record<string, readonly [number, FieldKind]>>;

export function assertLayout(tables: Tables, row: TableRow, layout: Layout, maxFields: number) {
  const fields = tables.fields(row);
  if (fields.length > maxFields) throw new Error(`Unexpected neighbor table layout: ${row.root}`);
  const end =
    row.rowOffset + tables.reader.u16(row.rowOffset - tables.reader.i32(row.rowOffset) + 2);
  for (const [field, kind] of Object.values(layout)) {
    const position = fields[field];
    if (position == null) continue;
    const next = Math.min(end, ...fields.filter((p): p is number => p !== null && p > position));
    if (next - position !== 4 || !tables.reader.inRange(position, 4))
      throw new Error(`Invalid neighbor ${kind} width: ${row.root}.${field}`);
    if (kind === "string" && tables.string(row, field) === null)
      throw new Error(`Invalid neighbor string: ${row.root}.${field}`);
    if (kind === "vector") tables.vector(row, field);
  }
}

export function requiredId(tables: Tables, row: TableRow, field: number): number {
  const value = tables.uint(row, field);
  if (value === null || value <= 0) throw new Error(`Invalid neighbor ID: ${row.root}.${field}`);
  return value;
}

export function localized(tables: Tables, row: TableRow, field: number): string | null {
  const hash = tables.uint(row, field);
  if (hash === null || hash === 0) return null;
  const text = tables.text(row, field);
  if (text === null) throw new Error(`Unresolved neighbor TextMap: ${row.root}.${field}/${hash}`);
  return text;
}

export function optionalString(tables: Tables, row: TableRow, field: number): string | null {
  try {
    return tables.string(row, field);
  } catch {
    return null;
  }
}

export function requiredText(value: string | null, context: string): string {
  if (!value?.trim()) throw new Error(`Missing neighbor text: ${context}`);
  return value;
}

export function normalizedPath(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes(".."))
    throw new Error(`Invalid neighbor asset path: ${value}`);
  return normalized;
}
