import { z } from "zod";
import { contentGroups } from "@loomix/content-schema";

const common = {
  id: z.number().int(),
  group: z.enum(contentGroups),
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
      field: z.literal("sizeRange"),
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
      field: z.literal("maturityPeriod"),
      seedId: z.number().nullable(),
      mode: z.string().nullable(),
      stages: z.array(z.number()).nullable(),
    })
    .strict(),
]);
export type FieldCandidate = z.infer<typeof fieldCandidateSchema>;
