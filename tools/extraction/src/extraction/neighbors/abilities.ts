import { hashTextKey } from "../decode/tables.ts";
import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborRecord } from "./types.ts";
import { fieldProof, nullableText } from "./observations.ts";

export function readAbilities(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
): Pick<NeighborRecord, "travelProfile" | "abilities" | "abilityDescriptions"> {
  const travel = tables.byId(641).get(id);
  const travelProfile = travel
    ? {
        specialties: [1, 2, 3, 4, 5, 6].flatMap((field) => {
          const label = nullableText(tables, travel, field);
          return label ? [{ categoryCode: field, label }] : [];
        }),
        invitation: {
          text: nullableText(tables, travel, 13),
          reactionKey: tables.string(travel, 14) || null,
        },
      }
    : null;
  if (travel) fieldProof(records, id, "travelProfile", travel, [0, 1, 2, 3, 4, 5, 6, 13, 14]);
  const abilityRows = tables
    .rows(222)
    .filter((row) => tables.uint(row, 1) === id)
    .sort((a, b) => tables.id(a) - tables.id(b));
  const abilities = abilityRows.map((row, index) => {
    const value = {
      key: `${id}:${tables.id(row)}`,
      unlockLevel: tables.id(row),
      name: nullableText(tables, row, 3),
      description: nullableText(tables, row, 4),
      icon: tables.string(row, 2) || null,
    };
    for (const [field, columns] of [
      ["key", [0, 1]],
      ["unlockLevel", [0]],
      ["name", [3]],
      ["description", [4]],
      ["icon", [2]],
    ] as const)
      fieldProof(
        records,
        id,
        `abilities.${index}.${field}`,
        row,
        [...columns],
        value[field] === null ? "ability_field_not_configured" : null,
      );
    return value;
  });
  const descriptionRows = tables
    .rows(461)
    .filter((row) => tables.uint(row, 0) === id && tables.uint(row, 2) === 100)
    .sort((a, b) => tables.uint(a, 1, 0) - tables.uint(b, 1, 0));
  const abilityDescriptions = descriptionRows.map((row, index) => {
    fieldProof(records, id, `abilityDescriptions.${index}`, row, [0, 1, 2, 4, 5]);
    const textKey = tables.string(row, 4);
    const localized = textKey ? tables.textmap[hashTextKey(textKey)] : undefined;
    if (textKey && !localized)
      throw new Error(`Unresolved ability text ${id}:${tables.uint(row, 1)}`);
    if (localized)
      fieldProof(
        records,
        id,
        `abilityDescriptions.${index}`,
        { root: 1, rowOffset: localized.rowOffset },
        [1],
      );
    return {
      key: `${id}:${tables.uint(row, 1)}`,
      text: tables.key(tables.string(row, 4)),
      unlockText: nullableText(tables, row, 5),
    };
  });
  return { travelProfile, abilities, abilityDescriptions };
}
