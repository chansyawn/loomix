import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { IdSchema, SourceSchema } from "@loomix/schema/common";
import { VignetteTextSchema } from "@loomix/schema/vignettes";
import { catalogSource, profile } from "../../../profile.ts";
import { digest } from "../../../workflow/hashing.ts";
import { vignetteHintsFile } from "./profile.ts";

const hintFields = [IdSchema, z.enum(["acquisition", "task-placement"]), IdSchema] as const;
const manifest = z.strictObject({
  source: SourceSchema,
  hints: z.union([z.tuple(hintFields), z.tuple([...hintFields, VignetteTextSchema])]).array(),
});

export function parseVignetteHints(bytes: Buffer) {
  const data = manifest.parse(JSON.parse(bytes.toString("utf8")));
  assert.deepEqual(
    data.source,
    { ...catalogSource, manifestId: profile.manifestId },
    "Vignette hint source",
  );
  return { hints: data.hints, sha256: digest(bytes) };
}

export const readVignetteHints = (source: string) =>
  parseVignetteHints(fs.readFileSync(path.join(source, vignetteHintsFile)));
