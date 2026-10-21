import { getPaths, profile } from "./config.mjs";
import fs from "node:fs";
import { ObbReader, decodeTextMapBucket } from "./obb-reader.mjs";
import { getConfigFile, activeConfigSource } from "./game-resource-paths.mjs";
const { out } = getPaths();
const r = new ObbReader(getConfigFile("ed.obb"));
const wrapper = r.ref(r.fields(r.u32(0))[profile.roots.textmap]),
  t = r.ref(r.fields(wrapper)[profile.fields.textmap.wrapper]),
  f = r.fields(t);
const count = r.u32(f[profile.fields.textmap.count]),
  buckets = r.ref(f[profile.fields.textmap.buckets]),
  values = r.ref(f[profile.fields.textmap.values]);
const valueCount = r.u32(values),
  bucketCount = r.u32(buckets),
  byHash = {};
for (let i = 0; i < bucketCount; i++) {
  const bucket = decodeTextMapBucket(r.b.subarray(buckets + 4 + i * 8, buckets + 12 + i * 8));
  if (!bucket) continue;
  const { hash, index } = bucket;
  if (index >= valueCount || byHash[hash]) throw new Error(`Invalid/duplicate TextMap bucket ${i}`);
  const row = r.ref(values + 4 + index * 4),
    fields = r.fields(row);
  byHash[hash] = {
    index,
    nameZh: r.string(fields[profile.fields.textmap.zh])?.text ?? null,
    nameEn: r.string(fields[profile.fields.textmap.en])?.text ?? null,
    rowOffset: row,
  };
}
if (Object.keys(byHash).length !== count || count !== valueCount)
  throw new Error("TextMap coverage mismatch");
if (count !== profile.expected.textmap || Object.values(byHash).some((x) => !x.nameZh))
  throw new Error("TextMap does not match the verified profile");
fs.writeFileSync(
  `${out}/textmap-zh-en.json`,
  JSON.stringify(
    {
      source: activeConfigSource().relativeDirectory + "/ed.obb",
      rootField: profile.roots.textmap,
      count,
      bucketCount,
      byHash,
    },
    null,
    2,
  ),
);
console.log({ count, bucketCount, withZh: Object.values(byHash).filter((x) => x.nameZh).length });
