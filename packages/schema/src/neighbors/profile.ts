import { z } from "zod";
import { IdSchema } from "../common/identity.ts";

const text = z.string().min(1).nullable();
export const NeighborProfileSchema = z.strictObject({
  englishName: text,
  nickname: text,
  gender: z.enum(["female", "male"]).nullable(),
  birthday: z
    .strictObject({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) })
    .nullable(),
});
export const TravelProfileSchema = z.strictObject({
  specialties: z.strictObject({ categoryCode: IdSchema, label: z.string().min(1) }).array(),
  invitation: z.strictObject({ text, reactionKey: text }),
});
export const AbilityDescriptionSchema = z.strictObject({
  key: z.string().min(1),
  text,
  unlockText: text,
});
export function createAbilitySchema<I extends z.ZodType>(image: I) {
  return z.strictObject({
    key: z.string().min(1),
    unlockLevel: IdSchema,
    name: text,
    description: text,
    icon: image,
  });
}
export const SignatureSchema = z.strictObject({
  cookingRecipeId: IdSchema.nullable(),
  friendshipOutfitItemId: IdSchema.nullable(),
});
export const NeighborDesignSchema = z.strictObject({
  furnitureSetId: IdSchema.nullable(),
  craftingCollectionId: IdSchema.nullable(),
});
