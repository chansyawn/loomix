import assert from "node:assert/strict";
import type { AcquisitionHints } from "../extraction/source/catalog/acquisition-hints.ts";
import type { Tables } from "../extraction/source/decode/tables.ts";

export function verifyAcquisitionHints(records: AcquisitionHints, tables: Tables): void {
  const displayRows = new Map(tables.rows(325).map((row) => [row.rowOffset, row]));
  const hintRows = new Map(tables.rows(618).map((row) => [row.rowOffset, row]));
  for (const { id, sourceIds, source } of records.displayRows) {
    const row = displayRows.get(source.rowOffset);
    assert.ok(row && source.table === 325 && source.row === id && tables.id(row) === id);
    assert.deepEqual(source.fields, [0, 2]);
    assert.deepEqual(sourceIds, tables.vector(row, 2), `Acquisition hint references ${id}`);
  }
  for (const hint of records.hintRows) {
    const source = hint.sources[0]!;
    const row = hintRows.get(source.rowOffset);
    assert.ok(row && source.table === 618 && source.row === hint.sourceId);
    assert.deepEqual(source.fields, [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(
      [
        hint.sourceId,
        hint.textKey,
        hint.actionText,
        hint.actionCode,
        hint.systemJump,
        hint.openStateCfgId,
      ],
      [
        tables.id(row),
        tables.uint(row, 1),
        tables.string(row, 2),
        ...[3, 4, 5].map((field) => tables.uint(row, field)),
      ],
      `Acquisition hint fields ${hint.sourceId}`,
    );
    const text = hint.textKey === null ? undefined : tables.textmap[hint.textKey];
    assert.equal(hint.label, text?.nameZh ?? null, `Acquisition hint text ${hint.sourceId}`);
    assert.deepEqual(
      hint.sources.slice(1),
      text?.nameZh
        ? [
            {
              file: "prepared/ed.obb",
              table: 1,
              row: hint.textKey,
              rowOffset: text.rowOffset,
              fields: [1],
            },
          ]
        : [],
    );
  }
}
