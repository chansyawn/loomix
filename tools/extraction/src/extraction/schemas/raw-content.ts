import { z } from "zod";
import { createCatalogSchema } from "@loomix/content-schema";
export const RawContentSchema = createCatalogSchema(
  z
    .string()
    .regex(/^exports\/[a-f0-9]{24}\/(?:Texture2D|Sprite)\/[^/\\]+\.png$/)
    .nullable(),
);
export function parseRawContent(input: unknown) {
  return RawContentSchema.parse(input);
}
