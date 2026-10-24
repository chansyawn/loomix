import { z } from "zod";
import {
  CatalogSourceSchema,
  createCatalogRecordSchema,
  DeliveredImageSchema,
  attributeSchemas,
  recordSchemas,
} from "./records.ts";
import type { CatalogRecord, CatalogSource, RecordType } from "./records.ts";
export function createCatalogSchema(image: z.ZodType<string | null> = DeliveredImageSchema) {
  return z
    .strictObject({
      schemaVersion: z.literal(2),
      source: CatalogSourceSchema,
      items: createCatalogRecordSchema(image).array(),
    })
    .superRefine((catalog, ctx) => {
      const records = new Map<number, CatalogRecord>();
      catalog.items.forEach((record, index) => {
        if (records.has(record.id))
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "id"],
            message: `Duplicate item ID ${record.id}`,
          });
        records.set(record.id, record);
      });
      catalog.items.forEach((record, index) => {
        if (!("memberIds" in record)) return;
        const seen = new Set<number>();
        (record.memberIds ?? []).forEach((id, memberIndex) => {
          const path = ["items", index, "memberIds", memberIndex];
          if (seen.has(id))
            ctx.addIssue({ code: "custom", path, message: `Duplicate member ID ${id}` });
          const member = records.get(id);
          if (!member || member.category !== record.category || member.kind !== "item")
            ctx.addIssue({
              code: "custom",
              path,
              message: `Member ${id} must be an item in ${record.category}`,
            });
          seen.add(id);
        });
      });
    });
}
export const CatalogSchema = createCatalogSchema();
export type Catalog = z.infer<typeof CatalogSchema>;
export function parseCatalog(input: unknown): Catalog {
  return CatalogSchema.parse(input);
}
export function emptyCatalog(source: CatalogSource): Catalog {
  return { schemaVersion: 2, source: { ...source }, items: [] };
}
export function recordType(record: Pick<CatalogRecord, "category" | "kind">): RecordType {
  return `${record.category}.${record.kind}` as RecordType;
}
export const recordTypes = Object.keys(recordSchemas) as RecordType[];
export function recordFields(type: RecordType): string[] {
  const fields = Object.keys(recordSchemas[type].shape).filter(
    (field) => field !== "encyclopediaEntry" && field !== "attributes",
  );
  if (type.endsWith(".item")) {
    const category = type.split(".")[0] as CatalogRecord["category"];
    fields.push(
      ...Object.keys(attributeSchemas[category].shape).map((field) => `attributes.${field}`),
    );
  }
  return fields;
}
export function recordField(record: CatalogRecord, field: string): unknown {
  if (field.startsWith("attributes.") && record.kind === "item")
    return Reflect.get(record.attributes, field.slice(11));
  return Reflect.get(record, field);
}
