import type {
  ConfigSource,
  TableIndex,
  TableRow,
  Row,
  TextMap,
  ScalarMethod,
} from "../../tasks/content/types.ts";
import path from "node:path";
import { ObbReader } from "./obb.ts";
import { readJson } from "../../workflow/json.ts";
import { profile } from "../../profile.ts";

export function hashTextKey(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (Math.imul(hash, 31) + value.charCodeAt(i)) >>> 0;
  return hash;
}

export function readUIntVector(
  reader: ObbReader,
  position: number | null | undefined,
  max = 10000,
) {
  if (position == null) return null;
  if (!reader.inRange(position)) throw new Error("Vector reference is out of bounds");
  const start = reader.ref(position);
  if (!reader.inRange(start)) throw new Error("Vector header is out of bounds");
  const count = reader.u32(start);
  if (count > max || !reader.inRange(start + 4, count * 4))
    throw new Error("Invalid vector length");
  return Array.from({ length: count }, (_, i) => reader.u32(start + 4 + i * 4));
}

export class Tables {
  reader: ObbReader;
  index: Map<number, TableIndex>;
  textmap: TextMap["byHash"];
  cache = new Map<number, TableRow[]>();
  fieldCache = new Map<number, (number | null)[]>();
  constructor(prepared: string) {
    const source = readJson<ConfigSource>(path.join(prepared, "active-config-source.json"));
    if (
      source.dataRevision !== profile.dataRevision ||
      !source.files.every((f) => f.matchesManifest)
    )
      throw new Error("Unverified configuration");
    this.reader = new ObbReader(source.files.find((f) => f.file.endsWith("ed.obb"))!.file);
    this.index = new Map(
      readJson<TableIndex[]>(path.join(prepared, "obb-table-index.json")).map((t) => [t.field, t]),
    );
    this.textmap = readJson<TextMap>(path.join(prepared, "textmap-zh-en.json")).byHash;
  }
  rows(root: number) {
    if (!this.cache.has(root)) {
      const index = this.index.get(root);
      if (!index) throw new Error(`Missing table ${root}`);
      this.cache.set(
        root,
        this.reader.rows(index).map((rowOffset) => ({ root, rowOffset })),
      );
    }
    return this.cache.get(root)!;
  }
  fields(row: Row) {
    if (!row) return [];
    if (!this.fieldCache.has(row.rowOffset)) {
      const fields = this.reader.fields(row.rowOffset);
      if (!fields) throw new Error(`Invalid table row at ${row.rowOffset}`);
      this.fieldCache.set(row.rowOffset, fields);
    }
    return this.fieldCache.get(row.rowOffset)!;
  }
  scalar(
    row: Row,
    field: number,
    width: number,
    method: ScalarMethod,
    fallback: number | null = null,
  ) {
    const fields = this.fields(row),
      p = fields[field];
    if (p == null || !row) return fallback;
    const end = row.rowOffset + this.reader.u16(row.rowOffset - this.reader.i32(row.rowOffset) + 2);
    const next = Math.min(end, ...fields.filter((q): q is number => q != null && q > p));
    if (p + width > next || !this.reader.inRange(p, width))
      throw new Error(`Invalid scalar width: ${row.root}.${field}`);
    return this.reader.scalar(p, width, method);
  }
  uint(row: Row, field: number, fallback: number): number;
  uint(row: Row, field: number, fallback?: null): number | null;
  uint(row: Row, field: number, fallback: number | null = null) {
    return this.scalar(row, field, 4, "readUInt32LE", fallback);
  }
  byte(row: Row, field: number, fallback: number): number;
  byte(row: Row, field: number, fallback?: null): number | null;
  byte(row: Row, field: number, fallback: number | null = null) {
    return this.scalar(row, field, 1, "readUInt8", fallback);
  }
  float(row: Row, field: number, fallback: number): number;
  float(row: Row, field: number, fallback?: null): number | null;
  float(row: Row, field: number, fallback: number | null = null) {
    return this.scalar(row, field, 4, "readFloatLE", fallback);
  }
  string(row: Row, field: number) {
    const p = this.fields(row)[field];
    if (p == null || !row) return null;
    const value = this.reader.string(p);
    if (!value) throw new Error(`Invalid string: ${row.root}.${field}`);
    return value.text;
  }
  vector(row: Row, field: number) {
    return readUIntVector(this.reader, this.fields(row)[field]);
  }
  text(row: Row, field: number) {
    const hash = this.uint(row, field);
    return hash == null ? null : (this.textmap[hash]?.nameZh ?? null);
  }
  key(key: string | null | undefined) {
    return key ? (this.textmap[hashTextKey(key)]?.nameZh ?? null) : null;
  }
  id(row: Row): number {
    const id = this.uint(row, 0);
    if (id == null) throw new Error("Missing row ID");
    return id;
  }
  byId(root: number, signature?: (row: TableRow) => unknown, ids?: Set<number>) {
    const map = new Map<number | null, TableRow>();
    for (const row of this.rows(root)) {
      const id = this.uint(row, 0, 0);
      if (ids && !ids.has(id)) continue;
      if (map.has(id)) {
        if (
          !signature ||
          JSON.stringify(signature(map.get(id)!)) !== JSON.stringify(signature(row))
        )
          throw new Error(`Conflicting duplicate key ${root}:${id}`);
        continue;
      }
      map.set(id, row);
    }
    return map;
  }
}

export function indexTables(reader: ObbReader): TableIndex[] {
  const root = reader.u32(0);
  const fields = reader.requiredFields(root);
  const indexes: TableIndex[] = [];
  for (let field = 0; field < fields.length; field++) {
    if (field === profile.roots.textmap) continue;
    const reference = fields[field];
    if (!reference) continue;
    const table = reader.ref(reference);
    const tableFields = reader.fields(table);
    if (!tableFields || !tableFields[0]) continue;
    const vector = reader.ref(tableFields[0]);
    if (!reader.inRange(vector)) continue;
    const count = reader.u32(vector);
    if (count > 200_000 || !reader.inRange(vector + 4, count * 4)) continue;
    indexes.push({ field, vector, count });
  }
  if (indexes.length !== profile.expected.tables)
    throw new Error("Table count does not match the verified profile");
  return indexes;
}
