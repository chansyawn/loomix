import { z } from "zod";
import { HashSchema } from "../common/identity.ts";

export const ReleaseIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const SHARED_IMAGE_LAYOUT = "shared-images-v1";
export const ReleaseMarkerSchema = z.strictObject({
  release: ReleaseIdSchema,
  manifestSha256: HashSchema,
  storageLayout: z.literal(SHARED_IMAGE_LAYOUT),
});
export type ReleaseMarker = z.infer<typeof ReleaseMarkerSchema>;
