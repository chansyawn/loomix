import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborExclusion, NeighborRecord } from "./types.ts";
import { excludeField, fieldProof, nullableText } from "./observations.ts";

export function readProfile(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): Pick<NeighborRecord, "profile" | "signature"> {
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
    gender: tables.string(row, 20) as "female" | "male" | null,
    birthday: month !== null && day !== null ? { month, day } : null,
  };
  for (const [field, fields] of [
    ["englishName", [1]],
    ["gender", [20]],
    ["birthday", [16, 17]],
  ] as const)
    fieldProof(records, id, `profile.${field}`, row, [...fields]);
  fieldProof(
    records,
    id,
    "profile.nickname",
    nickname[0] ?? row,
    nickname[0] ? [0, 2] : [0],
    profile.nickname === null ? "nickname_not_configured" : null,
  );
  const signatureRow = tables.byId(500).get(id);
  if (!signatureRow) throw new Error(`Missing neighbor signature ${id}`);
  const cookingRecipeId = tables.uint(signatureRow, 2);
  if (cookingRecipeId !== null && !tables.byId(122).has(cookingRecipeId))
    throw new Error(`Missing signature recipe ${id}`);
  const outfit = tables.uint(signatureRow, 1);
  const main = tables.byId(318);
  const validOutfit = outfit !== null && main.has(outfit);
  if (validOutfit && tables.uint(main.get(outfit), 2) !== 20)
    throw new Error(`Invalid signature outfit type ${id}:${outfit}`);
  if (outfit !== null && !validOutfit) {
    if (
      ![
        [1005, 60426],
        [1015, 60648],
      ].some(([npc, item]) => npc === id && item === outfit)
    )
      throw new Error(`Unexpected missing signature outfit ${id}:${outfit}`);
    excludeField(
      records,
      exclusions,
      id,
      "signature.friendshipOutfitItemId",
      signatureRow,
      [0, 1],
      "signature_outfit_missing_in_frozen_snapshot",
    );
  } else fieldProof(records, id, "signature.friendshipOutfitItemId", signatureRow, [0, 1]);
  fieldProof(records, id, "signature.cookingRecipeId", signatureRow, [0, 2]);
  return {
    profile,
    signature: { cookingRecipeId, friendshipOutfitItemId: validOutfit ? outfit : null },
  };
}
