import { z } from "zod";
import { recordTypes } from "@loomix/schema/extraction";
import { RecipeSchema } from "@loomix/schema/extraction";

const tableEvidence = z
  .object({
    table: z.number().int(),
    field: z.union([z.number().int(), z.array(z.number().int())]),
    note: z.string().optional(),
  })
  .strict();
const resourceEvidence = z
  .object({ reference: z.string(), container: z.string(), source: z.string(), pathId: z.string() })
  .strict();
const sourceReference = z
  .object({
    file: z.string().min(1),
    table: z.number().int().optional(),
    row: z.number().int().optional(),
    rowOffset: z.number().int().optional(),
    fields: z.array(z.number().int()).optional(),
    pathId: z.string().optional(),
    pointer: z.string().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export const fieldEvidenceSchema = z
  .object({
    id: z.number().int(),
    group: z.enum(recordTypes),
    field: z.string().min(1),
    value: z.union([z.string(), z.number(), z.array(z.number()), RecipeSchema, z.null()]),
    evidence: z.union([
      z.strictObject({
        kind: z.literal("manual"),
        file: z.string(),
        pointer: z.string(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
      tableEvidence,
      z.array(tableEvidence),
      resourceEvidence,
      z.array(z.string()),
    ]),
    sources: z.array(sourceReference),
    association: z.string().min(1),
    transformation: z.string().min(1),
    status: z.enum(["confirmed", "unconfirmed"]),
    reason: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((proof, context) => {
    if (proof.value === null && (!proof.reason || proof.status !== "unconfirmed"))
      context.addIssue({
        code: "custom",
        message: "Unknown fields require an explicit reason and unconfirmed status",
      });
    const hasConcreteSource = proof.sources.some(
      (source) =>
        (source.table !== undefined && source.rowOffset !== undefined) ||
        source.pathId ||
        (["category", "kind", "subcategory"].includes(proof.field) &&
          source.pointer &&
          source.sha256),
    );
    if (
      proof.value !== null &&
      (proof.status === "unconfirmed"
        ? proof.field !== "recipe" || !proof.reason || !hasConcreteSource
        : proof.status !== "confirmed" || !hasConcreteSource)
    )
      context.addIssue({
        code: "custom",
        message:
          "Populated fields require concrete provenance; unconfirmed values are limited to documented recipe evidence",
      });
  });
export type FieldEvidence = z.infer<typeof fieldEvidenceSchema>;

const common = {
  id: z.number().int(),
  group: z.enum(recordTypes),
  value: z.null(),
  table: z.number().int(),
  status: z.literal("unconfirmed"),
  reason: z.string().min(1),
  association: z.string().min(1),
  transformation: z.string().min(1),
  sources: z.array(
    z
      .object({
        file: z.string(),
        table: z.number().int(),
        rowOffset: z.number().int(),
        fields: z.array(z.number().int()),
      })
      .strict(),
  ),
};
export const fieldCandidateSchema = z.discriminatedUnion("field", [
  z
    .object({
      ...common,
      field: z.literal("attributes.sizeRange"),
      fields: z.array(z.number().int()),
      min: z.number().nullable(),
      max: z.number().nullable(),
      scale: z.number().nullable(),
      extraScale: z.number().nullable(),
      taskText: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      ...common,
      field: z.literal("attributes.maturityPeriod"),
      seedId: z.number().nullable(),
      mode: z.string().nullable(),
      stages: z.array(z.number()).nullable(),
    })
    .strict(),
]);
export type FieldCandidate = z.infer<typeof fieldCandidateSchema>;
