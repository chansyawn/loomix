import type { Tables } from "../decode/tables.ts";
import type { NeighborEvidence, NeighborExclusion, NeighborRecord } from "./types.ts";
import { excludeField, fieldProof, nullableText } from "./observations.ts";

export function readHouse(
  tables: Tables,
  id: number,
  records: NeighborEvidence[],
  exclusions: NeighborExclusion[],
): NeighborRecord["house"] {
  const houses = tables.rows(310).filter((row) => tables.uint(row, 2) === id);
  if (houses.length !== 1) throw new Error(`Unexpected house count ${id}:${houses.length}`);
  const house = houses[0]!,
    houseId = tables.id(house),
    buildingPackageItemId = tables.uint(house, 5);
  if (buildingPackageItemId !== null && !tables.byId(318).has(buildingPackageItemId))
    throw new Error(`Missing building package ${id}`);
  if (
    buildingPackageItemId !== null &&
    tables.uint(tables.byId(318).get(buildingPackageItemId), 2) !== 35
  )
    throw new Error(`Invalid building package type ${id}`);
  fieldProof(records, id, "house.id", house, [0, 2]);
  fieldProof(records, id, "house.buildingPackageItemId", house, [0, 2, 5]);
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
        upgradeHint: nullableText(tables, row, 17),
        upgradeRequirements: null,
      };
      for (const [field, fields] of [
        ["id", [0]],
        ["level", [2]],
        ["name", [3]],
        ["description", [18]],
        ["image", [21]],
        ["upgradeHint", [17]],
      ] as const)
        fieldProof(
          records,
          id,
          `house.stages.${index}.${field}`,
          row,
          [...fields],
          stage[field] === null ? "house_field_not_configured" : null,
        );
      const groups = [11, 26]
        .map((field) => tables.uint(row, field))
        .filter((group): group is number => group !== null);
      for (const group of groups) {
        const requirements = tables.rows(377).filter((entry) => tables.id(entry) === group);
        if (!requirements.length) throw new Error(`Missing house requirement group ${group}`);
        for (const requirement of requirements) {
          if (!tables.byId(318).has(tables.uint(requirement, 1)))
            throw new Error(`Missing house requirement item ${group}`);
          excludeField(
            records,
            exclusions,
            id,
            `house.stages.${index}.upgradeRequirements`,
            requirement,
            [0, 1, 2, 3],
            "house_requirement_quantity_semantics_unconfirmed",
          );
        }
      }
      if (!groups.length)
        fieldProof(
          records,
          id,
          `house.stages.${index}.upgradeRequirements`,
          row,
          [11, 26],
          "house_requirements_not_configured",
        );
      return stage;
    });
  return { id: houseId, buildingPackageItemId, stages };
}
