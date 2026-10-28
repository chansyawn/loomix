import { z } from "zod";
import { ContextSchema, HashSchema, IdSchema } from "../common/identity.ts";

export const EntityRefSchema = z.strictObject({
  collection: z.string().min(1),
  id: z.union([IdSchema, z.string().min(1)]),
});
export const EvidenceSourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("table"),
    file: z.string().min(1),
    table: z.number().int().nonnegative(),
    rowOffset: z.number().int().nonnegative(),
    fields: z.number().int().nonnegative().array().min(1),
  }),
  z.strictObject({ kind: z.literal("asset"), file: z.string().min(1), pathId: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("tableScan"),
    file: z.string().min(1),
    table: z.number().int().nonnegative(),
  }),
  z.strictObject({
    kind: z.literal("manual"),
    file: z.string().min(1),
    pointer: z.string().startsWith("/"),
    sha256: HashSchema,
  }),
]);
export const FieldEvidenceSchema = z
  .strictObject({
    entity: EntityRefSchema,
    fieldPath: z.string().min(1),
    status: z.enum(["confirmed", "absent", "unresolved"]),
    sources: EvidenceSourceSchema.array(),
    ruleId: z.string().min(1),
    reasonCode: z.string().min(1).nullable(),
  })
  .superRefine((proof, ctx) => {
    if (proof.status !== "confirmed" && proof.reasonCode === null)
      ctx.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "Unresolved or absent fields require a reason",
      });
    if (proof.status === "confirmed" && proof.sources.length === 0)
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Confirmed fields require concrete provenance",
      });
  });
export const EvidenceSchema = ContextSchema.extend({
  kind: z.literal("evidence"),
  fields: FieldEvidenceSchema.array(),
});
export type FieldEvidence = z.infer<typeof FieldEvidenceSchema>;
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
