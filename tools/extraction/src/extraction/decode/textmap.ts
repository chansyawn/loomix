import { decodeTextMapBucket } from "./obb.ts";
import type { ObbReader } from "./obb.ts";
import type { TextEntry, TextMap } from "../types.ts";
import { profile } from "../../profile.ts";

export interface DecodedTextMap {
  count: number;
  bucketCount: number;
  byHash: TextMap["byHash"];
}

export function decodeTextMap(reader: ObbReader): DecodedTextMap {
  const wrapper = reader.ref(reader.requiredFields(reader.u32(0))[profile.roots.textmap]);
  const table = reader.ref(reader.requiredFields(wrapper)[profile.fields.textmap.wrapper]);
  const fields = reader.requiredFields(table);
  const count = reader.u32(fields[profile.fields.textmap.count]);
  const buckets = reader.ref(fields[profile.fields.textmap.buckets]);
  const values = reader.ref(fields[profile.fields.textmap.values]);
  const valueCount = reader.u32(values);
  const bucketCount = reader.u32(buckets);
  const byHash: Record<number, TextEntry> = {};
  for (let index = 0; index < bucketCount; index++) {
    const bucket = decodeTextMapBucket(
      reader.b.subarray(buckets + 4 + index * 8, buckets + 12 + index * 8),
    );
    if (!bucket) continue;
    const { hash } = bucket;
    if (bucket.index >= valueCount || byHash[hash])
      throw new Error(`Invalid/duplicate TextMap bucket ${index}`);
    const row = reader.ref(values + 4 + bucket.index * 4);
    const rowFields = reader.requiredFields(row);
    byHash[hash] = {
      index: bucket.index,
      nameZh: reader.string(rowFields[profile.fields.textmap.zh])?.text ?? null,
      nameEn: reader.string(rowFields[profile.fields.textmap.en])?.text ?? null,
      rowOffset: row,
    };
  }
  if (Object.keys(byHash).length !== count || count !== valueCount)
    throw new Error("TextMap coverage mismatch");
  if (count !== profile.expected.textmap || Object.values(byHash).some((entry) => !entry.nameZh))
    throw new Error("TextMap does not match the verified profile");
  return { count, bucketCount, byHash };
}
