import assert from "node:assert/strict";
import type { Neighbors } from "@loomix/schema/neighbors";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { neighborAllowlist } from "../extraction/source/neighbors/allowlist.ts";
import type { NeighborDatabase } from "../extraction/source/neighbors/schema.ts";
import type { TableRow } from "../extraction/types.ts";
import { profile } from "../profile.ts";

function tableSource(row: TableRow, fields: number[]) {
  return {
    kind: "table" as const,
    file: "source/prepared/ed.obb",
    table: row.root,
    rowOffset: row.rowOffset,
    fields,
  };
}

export function verifyHouseUpgrades(
  tables: Tables,
  records: NeighborDatabase,
  published: Neighbors,
  evidence: readonly FieldEvidence[],
) {
  const proofs = new Map(
    evidence
      .filter(
        ({ entity, fieldPath }) =>
          entity.collection === "neighbors.neighbors" &&
          /^house\.stages\.\d+\.upgrade(?:\.|$)/.test(fieldPath),
      )
      .map((proof) => [`${proof.entity.id}:${proof.fieldPath}`, proof]),
  );
  const itemIds = new Set(tables.rows(318).map((row) => tables.id(row)));
  const expected = neighborAllowlist.map(({ id }) => {
    const houses = tables.rows(310).filter((row) => tables.uint(row, 2) === id);
    assert.equal(houses.length, 1, `Expected one house for ${id}`);
    const stages = tables
      .rows(315)
      .filter((row) => tables.uint(row, 1) === tables.id(houses[0]))
      .sort((first, second) => tables.uint(first, 2, 0) - tables.uint(second, 2, 0))
      .map((stage, index) => {
        const path = `${id}:house.stages.${index}.upgrade`;
        const stageId = tables.id(stage);
        const checkProof = (
          suffix: string,
          sources: ReturnType<typeof tableSource>[],
          absent = false,
        ) => {
          const key = path + suffix;
          const proof = proofs.get(key);
          assert.ok(proof, `Missing house upgrade evidence ${key}`);
          assert.equal(proof.status, absent ? "absent" : "confirmed", key);
          assert.equal(proof.reasonCode, absent ? "house_upgrade_not_configured" : null, key);
          assert.deepEqual(new Set(proof.sources), new Set(sources), key);
          proofs.delete(key);
        };
        const materialGroup = tables.uint(stage, 11);
        const blueprintGroup = tables.uint(stage, 26);
        if (materialGroup === null && blueprintGroup === null) {
          checkProof("", [tableSource(stage, [11, 26])], true);
          return { id: stageId, upgrade: null };
        }
        assert.ok(materialGroup && blueprintGroup, `Incomplete house upgrade ${stageId}`);
        const amounts = (group: number, field: number) =>
          tables
            .rows(377)
            .filter((row) => tables.uint(row, 0) === group)
            .map((row, position) => {
              const itemId = tables.uint(row, 1, 0);
              const quantity = tables.uint(row, 3, 0);
              assert.ok(
                itemIds.has(itemId) && quantity > 0,
                `Invalid house item ${group}:${itemId}`,
              );
              assert.equal(
                quantity,
                tables.uint(row, 2),
                `Variable house quantity ${group}:${itemId}`,
              );
              checkProof(field === 11 ? `.materials.${position}` : ".blueprint", [
                tableSource(stage, [field]),
                tableSource(row, [0, 1, 2, 3]),
              ]);
              return { itemId, quantity };
            });
        const materials = amounts(materialGroup, 11);
        const blueprints = amounts(blueprintGroup, 26);
        assert.ok(
          materials.length > 0 &&
            new Set(materials.map((entry) => entry.itemId)).size === materials.length,
        );
        assert.equal(blueprints.length, 1, `Expected one blueprint for ${stageId}`);
        return { id: stageId, upgrade: { materials, blueprint: blueprints[0]! } };
      });
    return { id, stages };
  });

  for (const source of [records, published]) {
    const actual = source.neighbors.map(({ id, house }) => ({
      id,
      stages: house?.stages.map(({ id: stageId, upgrade }) => ({ id: stageId, upgrade })),
    }));
    assert.deepEqual(actual, expected, "Independent neighbor house upgrades");
  }
  assert.equal(proofs.size, 0, "Unexpected house upgrade evidence");
  if (
    records.source.gameVersion === profile.gameVersion &&
    records.source.dataRevision === profile.dataRevision
  ) {
    const stages = expected.flatMap((house) => house.stages);
    const upgrades = stages.flatMap(({ upgrade }) => (upgrade ? [upgrade] : []));
    const materials = upgrades.flatMap((upgrade) => upgrade.materials);
    assert.deepEqual(
      {
        stages: stages.length,
        upgraded: upgrades.length,
        materials: materials.length,
        materialIds: new Set(materials.map((item) => item.itemId)).size,
        blueprintIds: new Set(upgrades.map((upgrade) => upgrade.blueprint.itemId)).size,
      },
      profile.expectedHouseUpgrades,
      "Frozen house upgrade coverage",
    );
    assert.ok(upgrades.every((upgrade) => upgrade.blueprint.quantity === 1));
  }
}
