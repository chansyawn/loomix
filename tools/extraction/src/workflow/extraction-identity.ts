import { z } from "zod";
import { FORMAT_VERSION, HashSchema } from "@loomix/schema/common";
import { digest } from "./hashing.ts";

export const ExtractionIdentitySchema = z.strictObject({
  stageManifestVersion: z.number().int().positive(),
  formatVersion: z.literal(FORMAT_VERSION),
  environmentId: HashSchema,
  inputs: HashSchema,
  profileHash: HashSchema,
  implementation: HashSchema,
  tool: HashSchema,
  admissions: HashSchema,
  vignetteHints: HashSchema,
  external: z.array(z.strictObject({ path: z.string().min(1), sha256: HashSchema })),
});

export type ExtractionIdentity = z.infer<typeof ExtractionIdentitySchema>;

export function extractionId(identity: ExtractionIdentity): string {
  const normalized = ExtractionIdentitySchema.parse(identity);
  normalized.external.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return digest(normalized);
}
