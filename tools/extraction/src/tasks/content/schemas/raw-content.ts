import { z } from "zod";
import { ContentSchema, recordSchemas } from "@loomix/content-schema";
import type { Content } from "@loomix/content-schema";

const image = z
  .string()
  .regex(/^exports\/[a-f0-9]{24}\/(?:Texture2D|Sprite)\/[^/\\]+\.png$/)
  .nullable();

// Only intermediate image references differ. Keep the shared field and membership constraints.
export const RawContentSchema = ContentSchema.safeExtend({
  furniture: z.strictObject({
    sets: recordSchemas["furniture.sets"].extend({ image }).array(),
    items: recordSchemas["furniture.items"].extend({ image }).array(),
  }),
  creatures: z.strictObject({
    series: recordSchemas["creatures.series"].extend({ image }).array(),
    items: recordSchemas["creatures.items"].extend({ image }).array(),
  }),
  plants: z.strictObject({
    series: recordSchemas["plants.series"].extend({ image }).array(),
    items: recordSchemas["plants.items"].extend({ image }).array(),
  }),
  dishes: z.strictObject({
    series: recordSchemas["dishes.series"].extend({ image }).array(),
    items: recordSchemas["dishes.items"].extend({ image }).array(),
  }),
  clothing: z.strictObject({
    sets: recordSchemas["clothing.sets"].extend({ image }).array(),
    items: recordSchemas["clothing.items"].extend({ image }).array(),
    appearances: recordSchemas["clothing.appearances"].extend({ image }).array(),
  }),
  miscellaneous: recordSchemas["miscellaneous"].extend({ image }).array(),
});

export function parseRawContent(input: unknown): Content {
  return RawContentSchema.parse(input);
}
