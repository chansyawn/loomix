import { z } from "zod";
import type { Tables } from "../decode/tables.ts";
import type { TableRow } from "../types.ts";

export const collectionSourceSchema = z.strictObject({
  file: z.literal("prepared/ed.obb"),
  table: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
  rowOffset: z.number().int().nonnegative(),
  fields: z.number().int().nonnegative().array().min(1),
});
export const collectionEvidenceSchema = z
  .strictObject({
    owner: z.enum(["item", "seed"]),
    id: z.number().int().positive(),
    field: z.string().min(1),
    value: z.json(),
    sources: collectionSourceSchema.array(),
    association: z.string().min(1),
    transformation: z.string().min(1),
    status: z.enum(["confirmed", "unconfirmed"]),
    reason: z.string().min(1).optional(),
  })
  .superRefine((proof, ctx) => {
    if (proof.value === null && (proof.status !== "unconfirmed" || !proof.reason))
      ctx.addIssue({ code: "custom", message: "Unknown collection fields require a reason" });
    if (proof.value !== null && (proof.status !== "confirmed" || !proof.sources.length))
      ctx.addIssue({ code: "custom", message: "Collection values require concrete provenance" });
  });
export type CollectionEvidence = z.infer<typeof collectionEvidenceSchema>;
export type CollectionSource = z.infer<typeof collectionSourceSchema>;

export function tableSource(
  tables: Pick<Tables, "id">,
  row: TableRow,
  fields: number[],
): CollectionSource {
  return {
    file: "prepared/ed.obb",
    table: row.root,
    row: tables.id(row),
    rowOffset: row.rowOffset,
    fields,
  };
}

export function localizedSources(
  tables: Tables,
  row: TableRow | undefined,
  fields: number[],
): CollectionSource[] {
  if (!row) return [];
  const result = [tableSource(tables, row, fields)];
  for (const field of fields) {
    const hash = tables.uint(row, field);
    const text = hash === null ? undefined : tables.textmap[hash];
    if (hash !== null && text?.nameZh)
      result.push({
        file: "prepared/ed.obb",
        table: 1,
        row: hash,
        rowOffset: text.rowOffset,
        fields: [1],
      });
  }
  return result;
}

export class CollectionEvidenceBuilder {
  readonly records: CollectionEvidence[] = [];
  put(
    owner: "item" | "seed",
    id: number,
    field: string,
    value: unknown,
    sources: CollectionSource[],
    association: string,
    transformation: string,
    reason = "configuration_missing",
  ): void {
    this.records.push(
      collectionEvidenceSchema.parse({
        owner,
        id,
        field,
        value,
        sources,
        association,
        transformation,
        status: value === null ? "unconfirmed" : "confirmed",
        ...(value === null ? { reason } : {}),
      }),
    );
  }
}
