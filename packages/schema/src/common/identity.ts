import { z } from "zod";

export const IdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const SourceSchema = z.strictObject({
  gameVersion: z.string().min(1),
  dataRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  resourceRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  manifestId: z.string().regex(/^\d+$/),
});
export const ContextSchema = z.strictObject({
  formatVersion: z.literal(1),
  snapshotId: HashSchema,
  locale: z.enum(["zh-CN", "en-US"]),
});
export type Source = z.infer<typeof SourceSchema>;
export type DatasetContext = z.infer<typeof ContextSchema>;

export interface ValidationIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

export function assertValid(issues: readonly ValidationIssue[]): void {
  if (issues.length)
    throw new Error(issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
}
