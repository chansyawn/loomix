import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { z } from "zod";
import { HashSchema } from "@loomix/schema/common";
import { CategorySchema, CatalogSourceSchema, ItemIdSchema } from "../../schema.ts";
import type { CatalogSource } from "../../schema.ts";
import { catalogSource } from "../../../profile.ts";
import { TableFieldSourceSchema } from "../../evidence/domain-schema.ts";

export const admissionsFile = "supplemental-admissions.json";
export const supplementalAdmissionsSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    source: CatalogSourceSchema,
    confirmation: z.strictObject({ kind: z.literal("manual"), note: z.string().min(1) }),
    entries: z.array(
      z.strictObject({
        id: ItemIdSchema,
        expectedName: z.string().min(1),
        category: CategorySchema,
        subcategory: z.string().nullable(),
      }),
    ),
  })
  .superRefine((input, ctx) => {
    const ids = new Set<number>();
    for (const [index, entry] of input.entries.entries()) {
      if (ids.has(entry.id))
        ctx.addIssue({
          code: "custom",
          path: ["entries", index, "id"],
          message: "Duplicate supplemental ID",
        });
      ids.add(entry.id);
    }
  });
export type SupplementalAdmissions = z.infer<typeof supplementalAdmissionsSchema>;
export interface FrozenAdmissions {
  data: SupplementalAdmissions;
  sha256: string;
  file: string;
}
const encyclopediaLocator = {
  file: z.literal("prepared/ed.obb"),
  table: z.literal(93),
};
const encyclopediaEvidenceSchema = z.discriminatedUnion("state", [
  z.strictObject({
    ...encyclopediaLocator,
    state: z.literal("present"),
    rowOffset: z.number().int().nonnegative(),
    listed: z.boolean(),
  }),
  z.strictObject({ ...encyclopediaLocator, state: z.literal("absent") }),
]);
const appearanceSourceSchema = z.strictObject({
  kind: z.enum(["initial", "televisionShop", "gacha", "gift"]),
  rows: TableFieldSourceSchema.array().min(1),
});
const admissionSourceSchema = z.union([
  z.strictObject({
    ...encyclopediaLocator,
    kind: z.literal("encyclopedia"),
    rowOffset: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal("manual"),
    file: z.string().min(1),
    pointer: z.string().min(1),
    sha256: HashSchema,
  }),
  appearanceSourceSchema,
]);
export const recordEvidenceSchema = z.strictObject({
  id: ItemIdSchema,
  admissionSources: admissionSourceSchema.array().min(1),
  encyclopedia: encyclopediaEvidenceSchema,
});
export const appearanceInvestigationSchema = z.strictObject({
  id: ItemIdSchema,
  tag: z.enum(["发型", "眼睛", "眉毛", "肤色", "面饰"]),
  reason: z.enum(["no_confirmed_acquisition", "unconfirmed_shop_group"]),
  encyclopedia: encyclopediaEvidenceSchema,
  rows: TableFieldSourceSchema.array(),
});
export type AppearanceSource = z.infer<typeof appearanceSourceSchema>;
export type AppearanceInvestigation = z.infer<typeof appearanceInvestigationSchema>;
export type RecordEvidence = z.infer<typeof recordEvidenceSchema>;
export type EncyclopediaEvidence = z.infer<typeof encyclopediaEvidenceSchema>;
export function parseAdmissions(
  bytes: Buffer,
  expected: CatalogSource = catalogSource,
): FrozenAdmissions {
  const data = supplementalAdmissionsSchema.parse(JSON.parse(bytes.toString("utf8")));
  assert.deepEqual(data.source, expected, "Supplemental admissions version mismatch");
  return {
    data,
    file: admissionsFile,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}
export function readAdmissions(work: string): FrozenAdmissions {
  return parseAdmissions(fs.readFileSync(path.join(work, admissionsFile)));
}
