import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { IdSchema, SourceSchema } from "@loomix/schema/common";
import { VignetteTextSchema } from "@loomix/schema/vignettes";
import { catalogSource, profile } from "../../../profile.ts";
import { digest } from "../../../workflow/hashing.ts";
import { vignetteAdmissionsFile } from "./profile.ts";

const decision = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("observed") }),
  z.strictObject({ kind: z.literal("task"), textId: IdSchema }),
  z.strictObject({ kind: z.literal("phone"), textId: IdSchema }),
  z.strictObject({ kind: z.literal("neighbor"), textId: IdSchema, neighborId: IdSchema }),
  z.strictObject({ kind: z.literal("test") }),
  z.strictObject({ kind: z.literal("unconfirmed") }),
]);
const hintFields = [IdSchema, z.enum(["acquisition", "task-placement"]), IdSchema] as const;
const manifest = z.strictObject({
  source: SourceSchema,
  entries: z.tuple([IdSchema, z.string().min(1), IdSchema, IdSchema.nullable(), decision]).array(),
  hints: z.union([z.tuple(hintFields), z.tuple([...hintFields, VignetteTextSchema])]).array(),
});
export type VignetteDecision = z.infer<typeof decision>;
export const admitted = ({ kind }: VignetteDecision): boolean =>
  kind !== "test" && kind !== "unconfirmed";

export function parseVignetteAdmissions(bytes: Buffer) {
  const data = manifest.parse(JSON.parse(bytes.toString("utf8")));
  assert.deepEqual(
    data.source,
    { ...catalogSource, manifestId: profile.manifestId },
    "Vignette admission source",
  );
  assert.equal(
    new Set(data.entries.map(([id]) => id)).size,
    data.entries.length,
    "Duplicate vignette admission",
  );
  const firstBatch = data.entries.filter(([, , , , evidence]) => admitted(evidence));
  assert.deepEqual(
    firstBatch.map(([, , order]) => order).sort((left, right) => left - right),
    Array.from({ length: 31 }, (_, index) => index + 1),
    "Vignette first batch order",
  );
  const acceptedIds = new Set(firstBatch.map(([id]) => id));
  for (const [id] of data.hints) assert.ok(acceptedIds.has(id), `Unadmitted vignette hint ${id}`);
  return { data, sha256: digest(bytes) };
}

export type VignetteAdmissions = ReturnType<typeof parseVignetteAdmissions>;
export const readVignetteAdmissions = (source: string) =>
  parseVignetteAdmissions(fs.readFileSync(path.join(source, vignetteAdmissionsFile)));
