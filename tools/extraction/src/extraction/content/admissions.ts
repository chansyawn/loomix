import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { z } from "zod";
import { CategorySchema, CatalogSourceSchema, ItemIdSchema } from "@loomix/content-schema";
import type { CatalogSource } from "@loomix/content-schema";
import { catalogSource } from "../../profile.ts";

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
export type AdmissionSource =
  | { kind: "encyclopedia"; file: string; table: 93; rowOffset: number }
  | { kind: "manual"; file: string; pointer: string; sha256: string };
export type EncyclopediaEvidence =
  | { state: "present"; file: string; table: 93; rowOffset: number; listed: boolean }
  | { state: "absent"; file: string; table: 93 };
export interface RecordEvidence {
  id: number;
  admissionSources: AdmissionSource[];
  encyclopedia: EncyclopediaEvidence;
}
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
