import type { TableIndex, TextMap } from "../types.ts";
import { readJson } from "../io.ts";
import { getPaths, profile } from "./config.ts";
import fs from "node:fs";
import { ObbReader } from "../obb-reader.ts";
import { getConfigFile } from "./game-resource-paths.ts";
const { out } = getPaths();
const r = new ObbReader(getConfigFile("ed.obb"));
const indexes = readJson<TableIndex[]>(`${out}/obb-table-index.json`);
const textmap = readJson<TextMap>(`${out}/textmap-zh-en.json`).byHash;
const summaries = [];
fs.mkdirSync(`${out}/decoded-tables`, { recursive: true });
for (const t of indexes) {
  if (t.field === profile.roots.textmap) continue;
  const rows = [],
    stringsByField: Record<number, number> = {},
    hashByField: Record<number, number> = {},
    samples = [];
  for (const rowOffset of r.rows(t)) {
    const f = r.fields(rowOffset);
    if (!f) continue;
    const words = f.map((p) => (p === null ? null : r.u32(p))),
      strings: Record<number, string> = {},
      texts: Record<number, { hash: number; zh: string | null; en: string | null }> = {};
    for (const [j, p] of f.entries()) {
      if (p === null) continue;
      const s = r.string(p);
      if (s) {
        strings[j] = s.text;
        stringsByField[j] = (stringsByField[j] ?? 0) + 1;
      }
      const hash = words[j];
      const localized = hash == null ? undefined : textmap[hash];
      if (localized && hash != null) {
        texts[j] = { hash, zh: localized.nameZh, en: localized.nameEn };
        hashByField[j] = (hashByField[j] ?? 0) + 1;
      }
    }
    const row = { rowOffset, words, strings, texts };
    rows.push(row);
    if (samples.length < 3) samples.push(row);
  }
  fs.writeFileSync(
    `${out}/decoded-tables/${t.field}.json`,
    JSON.stringify({ rootField: t.field, declaredCount: t.count, rows }, null, 2),
  );
  summaries.push({
    field: t.field,
    count: t.count,
    decodedRows: rows.length,
    stringsByField,
    hashByField,
    samples,
  });
}
fs.writeFileSync(`${out}/decoded-table-summary.json`, JSON.stringify(summaries, null, 2));
console.log(
  "Decoded tables",
  summaries.length,
  "rows",
  summaries.reduce((s, x) => s + x.decodedRows, 0),
);
