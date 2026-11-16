import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborRecord } from "./types.ts";
import { fieldProof, nullableText } from "./observations.ts";

export function readProfile(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
): Pick<NeighborRecord, "profile"> {
  const row = tables.byId(415).get(id);
  if (!row) throw new Error(`Missing neighbor profile ${id}`);
  const nickname = tables.rows(471).filter((entry) => tables.uint(entry, 0) === id);
  if (nickname.length > 1) throw new Error(`Duplicate neighbor nickname ${id}`);
  const month = tables.uint(row, 16),
    day = tables.uint(row, 17);
  const hash = tables.uint(row, 1);
  const profile = {
    englishName: hash === null ? null : tables.textmap[hash]?.nameEn || null,
    nickname: nullableText(tables, nickname[0], 2),
    birthday: month !== null && day !== null ? { month, day } : null,
  };
  fieldProof(records, id, "profile.englishName", row, [1]);
  fieldProof(records, id, "profile.birthday", row, [16, 17]);
  fieldProof(
    records,
    id,
    "profile.nickname",
    nickname[0] ?? row,
    nickname[0] ? [0, 2] : [0],
    profile.nickname === null ? "nickname_not_configured" : null,
  );
  return { profile };
}
