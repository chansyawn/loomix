import { z } from "zod";

export const IdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const NullableTextSchema = z.string().min(1).nullable();
export const SourceSchema = z.strictObject({
  gameVersion: z.string().min(1),
  dataRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  resourceRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  manifestId: z.string().regex(/^\d+$/),
});
export const FORMAT_VERSION = 17;
export const ContextSchema = z.strictObject({
  formatVersion: z.literal(FORMAT_VERSION),
  datasetId: HashSchema,
  locale: z.enum(["zh-CN", "en-US"]),
});
export type Source = z.infer<typeof SourceSchema>;
export type DatasetContext = z.infer<typeof ContextSchema>;

type IssuePath = (string | number)[];

export interface ValidationIssue {
  code: string;
  path: IssuePath;
  message: string;
}

export function assertValid(issues: readonly ValidationIssue[]): void {
  if (issues.length)
    throw new Error(issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
}

// 各层校验共用的问题收集器，路径统一带上所属文档前缀。
export function createIssueCollector(code: string, prefix: IssuePath = []) {
  const issues: ValidationIssue[] = [];
  const issue = (path: IssuePath, message: string) =>
    issues.push({ code, path: [...prefix, ...path], message });
  const unique = <T>(values: readonly T[], key: (value: T) => string | number, path: IssuePath) => {
    const seen = new Set<string | number>();
    values.forEach((value, index) => {
      const id = key(value);
      if (seen.has(id)) issue([...path, index], `Duplicate identity ${id}`);
      seen.add(id);
    });
  };
  return { issues, issue, unique };
}
