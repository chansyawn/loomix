import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborRecord } from "./types.ts";
import { fieldProof, nullableText } from "./observations.ts";

export function readHouse(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
): NeighborRecord["house"] {
  const houses = tables.rows(310).filter((row) => tables.uint(row, 2) === id);
  if (houses.length !== 1) throw new Error(`Unexpected house count ${id}:${houses.length}`);
  const house = houses[0]!,
    houseId = tables.id(house);
  const stages = tables
    .rows(315)
    .filter((row) => tables.uint(row, 1) === houseId)
    .sort((a, b) => tables.uint(a, 2, 0) - tables.uint(b, 2, 0))
    .map((row, index) => {
      const stage = {
        id: tables.id(row),
        level: tables.uint(row, 2, 0),
        name: nullableText(tables, row, 3)!,
        description: nullableText(tables, row, 18),
        image: tables.string(row, 21) || null,
      };
      for (const [field, fields] of [
        ["id", [0]],
        ["level", [2]],
        ["name", [3]],
        ["description", [18]],
        ["image", [21]],
      ] as const)
        fieldProof(
          records,
          id,
          `house.stages.${index}.${field}`,
          row,
          [...fields],
          stage[field] === null ? "house_field_not_configured" : null,
        );
      return stage;
    });
  fieldProof(records, id, "house", house, [0, 2]);
  return { id: houseId, stages };
}
