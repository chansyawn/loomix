import { z } from "zod";
import { createCatalogSchema } from "@loomix/schema/extraction";
export const RawImageSchema = z
  .string()
  .regex(
    /^(?:exports|seed-exports|stage-exports)\/[a-f0-9]{24}\/(?:Texture2D|Sprite)\/[^/\\]+\.png$/,
  )
  .nullable();
export const RawContentSchema = createCatalogSchema(RawImageSchema);
export function parseRawContent(input: unknown) {
  return RawContentSchema.parse(input);
}
