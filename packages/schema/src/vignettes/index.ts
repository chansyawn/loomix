import { z } from "zod";
import { ImageRefSchema } from "../assets/index.ts";
import { IdSchema } from "../common/identity.ts";

export const VignetteTextSchema = z.strictObject({ zh: z.string().min(1), en: z.string().min(1) });
const size = z.strictObject({ width: IdSchema, height: IdSchema });
const target = z.union([
  z.strictObject({ itemId: IdSchema }),
  z.strictObject({ allTagIds: IdSchema.array().min(1) }),
]);
const example = z.strictObject({ itemId: IdSchema, quantity: IdSchema });
const requirement = z.strictObject({
  target,
  support: target.nullable(),
  quantity: z.strictObject({ configured: IdSchema, displayed: IdSchema }),
  area: size.nullable(),
  label: VignetteTextSchema,
  examples: example.array(),
});
const rule = z.strictObject({ ruleId: IdSchema, text: VignetteTextSchema.nullable() });
const placementRule = z.discriminatedUnion("kind", [
  rule.extend({ kind: z.literal("range") }),
  rule.extend({ kind: z.literal("adjacent"), targets: target.array().min(2) }),
  rule.extend({ kind: z.literal("near-water"), target }),
  rule.extend({ kind: z.literal("align-water") }),
  rule.extend({ kind: z.literal("on-beach") }),
]);
export const VignetteSchema = z.strictObject({
  id: IdSchema,
  name: VignetteTextSchema,
  illustration: ImageRefSchema.extend({ variant: z.literal("illustration") }),
  stars: z.number().int().min(1).max(3),
  footprint: size,
  site: z.enum(["land", "water-edge", "beach"]),
  requirements: requirement.array().min(1),
  placementRules: placementRule.array().min(1),
  creatureItemIds: IdSchema.array(),
  neighborIds: IdSchema.array(),
  hints: z
    .strictObject({
      kind: z.enum(["acquisition", "task-placement"]),
      text: VignetteTextSchema,
    })
    .array(),
});
export const VignettesSchema = z.strictObject({
  templates: VignetteSchema.array(),
  fallbackItems: z.strictObject({ id: IdSchema, name: VignetteTextSchema }).array(),
});
export type Vignette = z.infer<typeof VignetteSchema>;
export type Vignettes = z.infer<typeof VignettesSchema>;
