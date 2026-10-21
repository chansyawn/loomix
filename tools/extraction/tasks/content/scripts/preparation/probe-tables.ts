import { getPaths, profile } from "./config.ts";
import fs from "node:fs";
import { getConfigFile } from "./game-resource-paths.ts";
const b = fs.readFileSync(getConfigFile("ed.obb"));
const u32 = (p: number) => (b.readUInt32BE(p) ^ profile.wordMask) >>> 0,
  i32 = (p: number) => u32(p) | 0,
  u16 = (p: number) => b.readUInt16BE(p) ^ profile.shortMask;
const ref = (p: number) => p + u32(p);
function table(p: number) {
  if (p < 0 || p + 4 > b.length) return null;
  const vt = p - i32(p);
  if (vt < 0 || vt + 4 > b.length) return null;
  const len = u16(vt),
    size = u16(vt + 2);
  if (len < 4 || len > 2000 || len % 2 || size < 4 || size > 10000 || vt + len > b.length)
    return null;
  return Array.from({ length: len / 2 - 2 }, (_, i) => {
    const off = u16(vt + 4 + i * 2);
    return off > 0 && off < size ? p + off : null;
  });
}
const root = u32(0),
  fields = table(root),
  counts = [];
if (!fields) throw new Error("Invalid OBB root table");
for (let i = 0; i < fields.length; i++) {
  if (i === profile.roots.textmap) continue; // TextMap 使用字典结构，不使用行向量包装结构。
  const f = fields[i];
  if (!f) continue;
  const t = ref(f),
    tf = table(t);
  if (!tf || !tf[0]) continue;
  const v = ref(tf[0]);
  if (v + 4 > b.length) continue;
  const count = u32(v);
  if (count > 200000 || v + 4 + count * 4 > b.length) continue;
  const row = count ? ref(v + 4) : null;
  const rf = row ? table(row) : null;
  counts.push({ field: i, table: t, vector: v, count, row, rowFields: rf?.length ?? null });
}
fs.writeFileSync(`${getPaths().out}/obb-table-index.json`, JSON.stringify(counts, null, 2));
if (counts.length !== profile.expected.tables)
  throw new Error("Table count does not match the verified profile");
console.log("tables", counts.length);
