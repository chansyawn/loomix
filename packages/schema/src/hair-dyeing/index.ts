import { z } from "zod";
import { ImageRefSchema } from "../assets/index.ts";
import { ItemAmountSchema } from "../catalog/recipes.ts";
import { IdSchema, NullableTextSchema } from "../common/identity.ts";
export { createFlowerDyeingMatcher } from "./flowers.ts";

const tag = z.string().min(1);
const channel = z.number().int().min(0).max(255);
const rgba = z.tuple([channel, channel, channel, channel]);
const icon = ImageRefSchema.extend({ variant: z.literal("icon") }).nullable();

export const HairDyeingSchema = z.strictObject({
  hairstyleConfigs: z
    .strictObject({
      itemId: IdSchema,
      regions: z
        .strictObject({
          id: IdSchema,
          name: tag,
          colorGroupIds: IdSchema.array().nullable(),
          defaultColorBlockId: IdSchema.nullable(),
        })
        .array(),
    })
    .array(),
  flowerInputs: z.strictObject({ itemId: IdSchema, colorTags: tag.array().min(1).max(2) }).array(),
  flowerRules: z
    .strictObject({
      id: IdSchema,
      groupId: IdSchema,
      outputTag: NullableTextSchema,
      singleTag: NullableTextSchema,
      pairTags: z.tuple([tag, tag]).nullable(),
    })
    .refine((rule) => rule.singleTag !== null || rule.pairTags !== null, "Missing flower match key")
    .array(),
  colorGroups: z
    .strictObject({
      id: IdSchema,
      name: NullableTextSchema,
      colorBlockIds: IdSchema.array(),
      displayColor: rgba,
      icon,
      unlock: z
        .strictObject({
          mode: z.enum(["full", "partial", "colorful"]),
          sort: z.number().int().nonnegative(),
          flowerMatchEnabled: z.boolean(),
          unlockCost: ItemAmountSchema.nullable(),
          dyeCost: ItemAmountSchema.nullable(),
        })
        .nullable(),
    })
    .array(),
  colorBlocks: z
    .strictObject({
      id: IdSchema,
      displayColor: rgba,
      visualKind: z.enum(["tint", "texture", "materialReplacement"]),
      icon,
    })
    .array(),
});

export type HairDyeing = z.infer<typeof HairDyeingSchema>;
export const parseHairDyeing = (input: unknown): HairDyeing => HairDyeingSchema.parse(input);
export const emptyHairDyeing = (): HairDyeing => ({
  hairstyleConfigs: [],
  flowerInputs: [],
  flowerRules: [],
  colorGroups: [],
  colorBlocks: [],
});
