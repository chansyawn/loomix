import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../../types.ts";
import type { NeighborEvidence, NeighborRecord } from "./types.ts";
import { evidence } from "./adapters.ts";
import { fieldProof, nullableText } from "./observations.ts";

function readUpgrade(
  tables: Tables,
  stage: TableRow,
  itemIds: ReadonlySet<number>,
  neighborId: number,
  fieldPath: string,
  records: NeighborEvidence[],
) {
  const materialsGroup = tables.uint(stage, 11);
  const blueprintGroup = tables.uint(stage, 26);
  if (materialsGroup === null && blueprintGroup === null) {
    records.push({
      ...evidence("neighbors", String(neighborId), stage, [11, 26]),
      fieldPath,
      status: "absent",
      reasonCode: "house_upgrade_not_configured",
    });
    return null;
  }
  const label = `house stage ${tables.id(stage)} (materials ${materialsGroup}, blueprint ${blueprintGroup})`;
  if (!materialsGroup || !blueprintGroup) throw new Error(`Incomplete upgrade for ${label}`);
  const groupRows = (group: number) => tables.rows(377).filter((row) => tables.id(row) === group);
  const materialRows = groupRows(materialsGroup);
  const blueprintRows = groupRows(blueprintGroup);
  if (!materialRows.length || blueprintRows.length !== 1)
    throw new Error(`Invalid upgrade group size for ${label}`);

  const amount = (row: TableRow, groupField: number, path: string) => {
    const itemId = tables.uint(row, 1, 0);
    const quantity = tables.uint(row, 2, 0);
    if (!itemIds.has(itemId) || !quantity || quantity !== tables.uint(row, 3))
      throw new Error(`Invalid item ${itemId} or quantity for ${label}`);
    fieldProof(records, neighborId, path, stage, [groupField]);
    fieldProof(records, neighborId, path, row, [0, 1, 2, 3]);
    return { itemId, quantity };
  };
  const materials = materialRows.map((row, index) =>
    amount(row, 11, `${fieldPath}.materials.${index}`),
  );
  if (new Set(materials.map(({ itemId }) => itemId)).size !== materials.length)
    throw new Error(`Duplicate upgrade material for ${label}`);
  return { materials, blueprint: amount(blueprintRows[0]!, 26, `${fieldPath}.blueprint`) };
}

export function readHouse(
  tables: Tables,
  id: number,
  itemIds: ReadonlySet<number>,
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
        upgrade: readUpgrade(tables, row, itemIds, id, `house.stages.${index}.upgrade`, records),
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
