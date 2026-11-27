import assert from "node:assert/strict";
import type { CollectionEvidence } from "../extraction/source/catalog/collection/evidence.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";
import type { TableRow } from "../extraction/types.ts";

export function verifyProofSources(proof: CollectionEvidence, tables: Tables): void {
  const rows: { row: TableRow; fields: number[] }[] = [];
  const add = (root: number, predicate: (row: TableRow) => boolean, fields: number[]) => {
    for (const row of tables.rows(root).filter(predicate)) rows.push({ row, fields });
  };
  if (proof.field === "attributes.scientificName") {
    add(93, (row) => tables.id(row) === proof.id, [16]);
  } else if (proof.field.startsWith("detail.")) {
    if (proof.field === "detail.flowerColors") {
      add(318, (row) => tables.id(row) === proof.id, [0, 9]);
    } else if (proof.field.startsWith("detail.creatureSize")) {
      add(132, (row) => tables.id(row) === proof.id, [0, 3, 4, 5, 6]);
    } else if (proof.field.startsWith("detail.creatureGrades")) {
      add(325, (row) => tables.id(row) === proof.id, [0, 12, 14]);
    } else if (proof.field.startsWith("detail.hybridRecipes")) {
      add(
        241,
        (row) => [1, 2, 3].some((field) => tables.uint(row, field) === proof.id),
        [0, 1, 2, 3],
      );
      add(244, (row) => tables.vector(row, 2)?.includes(proof.id) ?? false, [0, 1, 2]);
    } else if (proof.field.startsWith("detail.dishEffects")) {
      add(122, (row) => tables.uint(row, 4) === proof.id, [0, 4, 6, 7, 8]);
      const effectIds = new Set(
        rows.flatMap(({ row }) => {
          const raw = tables.string(row, 6);
          return raw && /^\d+(?:[,;]\d+)*$/.test(raw) ? raw.split(/[,;]/).map(Number) : [];
        }),
      );
      add(70, (row) => effectIds.has(tables.id(row)), [0, 1, 4, 10, 19]);
    } else if (proof.field.startsWith("detail.treeDrops")) {
      const tree = tables.rows(708).find((row) => tables.id(row) === proof.id);
      if (tree) {
        rows.push({ row: tree, fields: [0, 1, 2, 3, 5] });
        const groupId = tables.uint(tree, 5);
        add(563, (row) => tables.uint(row, 0) === groupId, [0, 1, 2, 3, 4, 5, 15]);
      }
    }
  } else {
    add(122, (row) => tables.uint(row, 4) === proof.id, [0, 2, 4, 15]);
    if (proof.field === "unlockCondition") {
      const ids = new Set(rows.map(({ row }) => tables.uint(row, 2)));
      add(121, (row) => ids.has(tables.id(row)), [0, 2]);
    }
  }
  for (const source of proof.sources) {
    if (source.table === 1) {
      const entry = tables.textmap[source.row];
      assert.ok(entry && entry.rowOffset === source.rowOffset);
      assert.deepEqual(source.fields, [1]);
      assert.ok(
        rows.some(({ row, fields }) =>
          fields.some((field) => tables.uint(row, field) === source.row),
        ),
        "Bound localized source hash",
      );
    } else {
      const match = rows.find(
        ({ row }) =>
          row.root === source.table &&
          row.rowOffset === source.rowOffset &&
          tables.id(row) === source.row,
      );
      assert.ok(match, `Unrelated collection source ${proof.id}.${proof.field}`);
      assert.deepEqual(source.fields, match.fields, "Exact collection source fields");
    }
  }
  if (proof.value !== null)
    for (const { row, fields } of new Map(
      rows.map((entry) => [
        `${entry.row.root}:${proof.field.startsWith("detail.treeDrops") ? entry.row.rowOffset : tables.id(entry.row)}`,
        entry,
      ]),
    ).values())
      assert.ok(
        proof.sources.some(
          (source) =>
            source.table === row.root &&
            source.row === tables.id(row) &&
            (!proof.field.startsWith("detail.treeDrops") || source.rowOffset === row.rowOffset) &&
            fields.every((field) => source.fields.includes(field)),
        ),
        "Complete joined source rows",
      );
}
