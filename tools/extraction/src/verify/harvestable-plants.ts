import assert from "node:assert/strict";
import type { Catalog, ItemOf } from "@loomix/schema/catalog";
import type { FieldEvidence } from "../extraction/evidence/domain-schema.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import { plainText } from "../extraction/source/catalog/model.ts";
import type { TableRow } from "../extraction/types.ts";
import type { PlantExclusion } from "../extraction/source/catalog/plants/read.ts";
import { verifyFieldSources } from "./evidence.ts";

export function verifyHarvestablePlants(
  tables: Tables,
  catalog: Catalog,
  baseIds: ReadonlySet<number>,
  evidence: readonly FieldEvidence[],
  exclusions: readonly PlantExclusion[],
) {
  const products = new Map(
    catalog.items.flatMap((item) =>
      baseIds.has(item.id) && item.kind === "plant" ? [[item.id, item.category] as const] : [],
    ),
  );
  const owners = new Map<number, TableRow[]>();
  for (const crop of tables.rows(144)) {
    if (!tables.vector(crop, 10)?.some((id) => products.get(id) === "作物")) continue;
    for (const id of tables.vector(crop, 8) ?? [])
      owners.set(id, [...(owners.get(id) ?? []), crop]);
  }
  const main = tables.byId(318),
    ui = new Map(tables.rows(325).map((row) => [tables.id(row), row]));
  const actual = new Map(
    catalog.items.flatMap((item) =>
      item.kind === "cropPlant" || item.kind === "flowerPlant" ? [[item.id, item] as const] : [],
    ),
  );
  const expected = new Set<number>();
  const expectedExclusions: PlantExclusion[] = [];
  const exclude = (row: TableRow, reason: PlantExclusion["reason"], fields: number[]) => {
    const id = tables.id(row);
    expectedExclusions.push({
      id,
      reason,
      sources: [
        { file: "prepared/ed.obb", table: row.root, row: id, rowOffset: row.rowOffset, fields },
      ],
    });
  };
  const proofs = new Map(
    evidence
      .filter((proof) => proof.entity.collection === "catalog.items")
      .map((proof) => [`${proof.entity.id}:${proof.fieldPath}`, proof]),
  );
  const check = (
    row: TableRow,
    kind: ItemOf<"cropPlant" | "flowerPlant">["kind"],
    harvest: number,
    sources: TableRow[],
  ) => {
    const id = tables.id(row);
    assert.ok(!expected.has(id));
    expected.add(id);
    const item = actual.get(id);
    assert.ok(item, `Missing harvestable plant ${id}`);
    assert.equal(item.kind, kind);
    assert.equal(item.harvestItemId, harvest, `Independent harvest ${id}`);
    assert.equal(item.name, plainText(tables.text(main.get(id), 1)));
    assert.equal(item.description, plainText(tables.text(ui.get(id), 27)));
    assert.equal(item.quality, ui.has(id) ? tables.uint(ui.get(id), 15, 0) : null);
    for (const field of ["kind", "harvestItemId"]) {
      const proof = proofs.get(`${id}:${field}`);
      verifyFieldSources(
        proof ? [proof] : [],
        "catalog.items",
        id,
        field,
        sources.map((source) => ({
          kind: "table" as const,
          file: "prepared/ed.obb",
          table: source.root,
          rowOffset: source.rowOffset,
          fields: source.root === 144 ? [0, 8, 10] : source.root === 241 ? [0, 1, 2] : [0, 1],
        })),
      );
    }
  };
  for (const row of tables.rows(137)) {
    const crops = owners.get(tables.id(row));
    if (!crops) {
      exclude(row, "outside_admitted_crop_growth", [0, 1]);
      continue;
    }
    const harvest = tables.uint(row, 1);
    assert.ok(harvest !== null && products.get(harvest) === "作物");
    assert.ok(crops.every((crop) => tables.vector(crop, 10)?.includes(harvest)));
    check(row, "cropPlant", harvest, [...crops, row]);
  }
  assert.deepEqual(new Set(owners.keys()), expected, "Missing mature crop configuration");
  for (const row of tables.rows(241)) {
    const targets = [tables.uint(row, 1), tables.uint(row, 2)].filter((id) => id !== null);
    if (!targets.some((id) => products.get(id) === "花")) {
      exclude(row, "no_listed_flower", [0, 1, 2]);
      continue;
    }
    assert.equal(new Set(targets).size, 1);
    check(row, "flowerPlant", targets[0], [row]);
  }
  assert.deepEqual(new Set(actual.keys()), expected);
  assert.deepEqual(
    exclusions.filter(
      ({ reason }) => reason === "outside_admitted_crop_growth" || reason === "no_listed_flower",
    ),
    expectedExclusions,
    "Independent plant exclusions",
  );
  return expected;
}
