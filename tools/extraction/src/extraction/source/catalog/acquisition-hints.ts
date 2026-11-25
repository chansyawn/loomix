import { z } from "zod";
import type { Tables } from "../decode/tables.ts";
import { collectionSourceSchema, localizedSources, tableSource } from "./collection/evidence.ts";

const uint = z.number().int().nonnegative();
export const acquisitionHintsSchema = z.strictObject({
  displayRows: z.array(
    z.strictObject({
      id: uint,
      sourceIds: uint.array().nullable(),
      source: collectionSourceSchema,
    }),
  ),
  hintRows: z.array(
    z.strictObject({
      sourceId: uint,
      textKey: uint.nullable(),
      label: z.string().nullable(),
      actionText: z.string().nullable(),
      actionCode: uint.nullable(),
      systemJump: uint.nullable(),
      openStateCfgId: uint.nullable(),
      sources: collectionSourceSchema.array().min(1),
    }),
  ),
});

export type AcquisitionHints = z.infer<typeof acquisitionHintsSchema>;

export function readAcquisitionHints(tables: Tables): AcquisitionHints {
  return {
    displayRows: tables.rows(325).map((row) => ({
      id: tables.id(row),
      sourceIds: tables.vector(row, 2),
      source: tableSource(tables, row, [0, 2]),
    })),
    hintRows: tables.rows(618).map((row) => ({
      sourceId: tables.id(row),
      textKey: tables.uint(row, 1),
      label: tables.text(row, 1),
      actionText: tables.string(row, 2),
      actionCode: tables.uint(row, 3),
      systemJump: tables.uint(row, 4),
      openStateCfgId: tables.uint(row, 5),
      sources: [
        tableSource(tables, row, [0, 1, 2, 3, 4, 5]),
        ...localizedSources(tables, row, [1]).slice(1),
      ],
    })),
  };
}
