import { getPaths, profile } from "./config.mjs";
import fs from "node:fs";
import { ObbReader } from "./obb-reader.mjs";
import { getConfigFile } from "./game-resource-paths.mjs";
const { out } = getPaths();
const r = new ObbReader(getConfigFile("ed.obb"));
const indexes = JSON.parse(fs.readFileSync(`${out}/obb-table-index.json`));
const textmap = JSON.parse(fs.readFileSync(`${out}/textmap-zh-en.json`)).byHash;
const summaries = [];
fs.mkdirSync(`${out}/decoded-tables`, { recursive: true });
for (const t of indexes) {
  if (t.field === profile.roots.textmap) continue;
  const rows = [],
    stringsByField = {},
    hashByField = {},
    samples = [];
  for (const rowOffset of r.rows(t)) {
    const f = r.fields(rowOffset);
    if (!f) continue;
    const words = f.map((p) => (p === null ? null : r.u32(p))),
      strings = {},
      texts = {};
    for (const [j, p] of f.entries()) {
      if (p === null) continue;
      const s = r.string(p);
      if (s) {
        strings[j] = s.text;
        stringsByField[j] = (stringsByField[j] ?? 0) + 1;
      }
      const localized = textmap[words[j]];
      if (localized) {
        texts[j] = { hash: words[j], zh: localized.nameZh, en: localized.nameEn };
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
