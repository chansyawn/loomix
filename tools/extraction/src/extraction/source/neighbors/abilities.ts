import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborRecord } from "./types.ts";
import { fieldProof, nullableText } from "./observations.ts";

export function readAbilities(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
): Pick<NeighborRecord, "abilities"> {
  const abilities = tables
    .rows(222)
    .filter((row) => tables.uint(row, 1) === id)
    .sort((a, b) => tables.id(a) - tables.id(b))
    .map((row, index) => {
      const value = {
        unlockLevel: tables.id(row),
        name: nullableText(tables, row, 3),
        description: nullableText(tables, row, 4),
      };
      for (const [field, columns] of [
        ["unlockLevel", [0]],
        ["name", [3]],
        ["description", [4]],
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
  return { abilities };
}
