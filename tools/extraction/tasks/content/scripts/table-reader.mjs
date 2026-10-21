import path from "node:path";
import { ObbReader } from "./obb-reader.mjs";
import { readJson } from "./io.mjs";
import { profile } from "./config.mjs";

export function hashTextKey(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (Math.imul(hash, 31) + value.charCodeAt(i)) >>> 0;
  return hash;
}

export function readUIntVector(reader, position, max = 10000) {
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
  constructor(prepared) {
    const source = readJson(path.join(prepared, "active-config-source.json"));
    if (
      source.dataRevision !== profile.dataRevision ||
      !source.files.every((f) => f.matchesManifest)
    )
      throw new Error("Unverified configuration");
    this.reader = new ObbReader(source.files.find((f) => f.file.endsWith("ed.obb")).file);
    this.index = new Map(
      readJson(path.join(prepared, "obb-table-index.json")).map((t) => [t.field, t]),
    );
    this.textmap = readJson(path.join(prepared, "textmap-zh-en.json")).byHash;
    this.cache = new Map();
    this.fieldCache = new Map();
  }
  rows(root) {
    if (!this.cache.has(root)) {
      const index = this.index.get(root);
      if (!index) throw new Error(`Missing table ${root}`);
      this.cache.set(
        root,
        this.reader.rows(index).map((rowOffset) => ({ root, rowOffset })),
      );
    }
    return this.cache.get(root);
  }
  fields(row) {
    if (!row) return [];
    if (!this.fieldCache.has(row.rowOffset)) {
      const fields = this.reader.fields(row.rowOffset);
      if (!fields) throw new Error(`Invalid table row at ${row.rowOffset}`);
      this.fieldCache.set(row.rowOffset, fields);
    }
    return this.fieldCache.get(row.rowOffset);
  }
  scalar(row, field, width, method, fallback = null) {
    const fields = this.fields(row),
      p = fields[field];
    if (p == null) return fallback;
    const end = row.rowOffset + this.reader.u16(row.rowOffset - this.reader.i32(row.rowOffset) + 2);
    const next = Math.min(end, ...fields.filter((q) => q != null && q > p));
    if (p + width > next || !this.reader.inRange(p, width))
      throw new Error(`Invalid scalar width: ${row.root}.${field}`);
    return this.reader.scalar(p, width, method);
  }
  uint(row, field, fallback = null) {
    return this.scalar(row, field, 4, "readUInt32LE", fallback);
  }
  byte(row, field, fallback = null) {
    return this.scalar(row, field, 1, "readUInt8", fallback);
  }
  float(row, field, fallback = null) {
    return this.scalar(row, field, 4, "readFloatLE", fallback);
  }
  string(row, field) {
    const p = this.fields(row)[field];
    if (p == null) return null;
    const value = this.reader.string(p);
    if (!value) throw new Error(`Invalid string: ${row.root}.${field}`);
    return value.text;
  }
  vector(row, field) {
    return readUIntVector(this.reader, this.fields(row)[field]);
  }
  text(row, field) {
    return this.textmap[this.uint(row, field)]?.nameZh ?? null;
  }
  key(key) {
    return key ? (this.textmap[hashTextKey(key)]?.nameZh ?? null) : null;
  }
  byId(root, signature, ids) {
    const map = new Map();
    for (const row of this.rows(root)) {
      const id = this.uint(row, 0, 0);
      if (ids && !ids.has(id)) continue;
      if (map.has(id)) {
        if (!signature || JSON.stringify(signature(map.get(id))) !== JSON.stringify(signature(row)))
          throw new Error(`Conflicting duplicate key ${root}:${id}`);
        continue;
      }
      map.set(id, row);
    }
    return map;
  }
}
