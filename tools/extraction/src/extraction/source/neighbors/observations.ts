import { localized } from "./fields.ts";
import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../../types.ts";
import type { NeighborEvidence } from "./types.ts";
import { evidence } from "./adapters.ts";

export function fieldProof(
  records: NeighborEvidence[],
  id: number,
  fieldPath: string,
  row: TableRow,
  fields: number[],
  reasonCode: string | null = null,
) {
  records.push({
    ...evidence("neighbors", String(id), row, fields),
    fieldPath,
    status: reasonCode ? "unresolved" : "confirmed",
    reasonCode,
  });
}
export function nullableText(
  tables: Tables,
  row: TableRow | undefined,
  field: number,
): string | null {
  return row ? localized(tables, row, field)?.trim() || null : null;
}

export function enrichFieldEvidence(tables: Tables, records: NeighborEvidence[]): void {
  const localized: NeighborEvidence[] = [];
  const textFields: Record<number, readonly number[]> = {
    415: [1],
    471: [2],
    222: [3, 4],
    315: [3, 18],
  };
  for (const proof of records) {
    if (!proof.fieldPath || proof.source.kind !== "table" || proof.source.table === 1) continue;
    const row = { root: proof.source.table, rowOffset: proof.source.rowOffset };
    for (const field of proof.source.fields) {
      if (!textFields[proof.source.table]?.includes(field)) continue;
      const hash = tables.uint(row, field);
      const entry = hash === null ? undefined : tables.textmap[hash];
      if (entry)
        localized.push({
          ...proof,
          source: {
            kind: "table",
            file: "prepared/ed.obb",
            table: 1,
            rowOffset: entry.rowOffset,
            fields: [proof.fieldPath === "profile.englishName" ? 0 : 1],
          },
        });
    }
  }
  records.push(...localized);
}
