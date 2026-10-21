import { getPaths } from "./config.mjs";
import fs from "node:fs";
import { ObbReader } from "./obb-reader.mjs";
import { getConfigFile } from "./game-resource-paths.mjs";
const r = new ObbReader(getConfigFile("cs.obb"));
const t = r.ref(r.fields(r.u32(0))[0]),
  f = r.fields(t);
const vecs = f.map((p) => r.ref(p));
const records = [];
for (let i = 0; i < r.u32(vecs[0]); i++) {
  const name = r.string(vecs[0] + 4 + i * 4)?.text;
  const props = {};
  for (const k of [4, 6]) {
    const q = r.ref(vecs[k] + 4 + i * 4),
      fields = r.fields(q);
    props[k] = fields?.map((p) => (p === null ? null : r.u32(p)));
  }
  records.push({ index: i, name, props });
}
const dirs = [];
for (let i = 0; i < r.u32(vecs[1]); i++) {
  const name = r.string(vecs[1] + 4 + i * 4)?.text,
    properties = {};
  for (const k of [2, 3]) properties[k] = r.u32(vecs[k] + 4 + i * 4);
  const q = r.ref(vecs[5] + 4 + i * 4);
  properties[5] = r.fields(q)?.map((p) => (p === null ? null : r.u32(p)));
  dirs.push({ index: i, name, properties });
}
fs.writeFileSync(
  `${getPaths().out}/cs-file-index.json`,
  JSON.stringify({ records, dirs }, null, 2),
);
console.log("files", records.length, "directories", dirs.length, "first", records.slice(0, 8));
