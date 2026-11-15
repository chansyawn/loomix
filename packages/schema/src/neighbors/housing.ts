import { z } from "zod";
import { IdSchema } from "../common/identity.ts";

const text = z.string().min(1).nullable();
export const ItemAmountSchema = z.strictObject({ itemId: IdSchema, quantity: IdSchema });
export function createHouseSchema<I extends z.ZodType>(image: I) {
  return z.strictObject({
    id: IdSchema,
    buildingPackageItemId: IdSchema.nullable(),
    stages: z
      .strictObject({
        id: IdSchema,
        level: IdSchema,
        name: z.string().min(1),
        description: text,
        image,
        upgradeHint: text,
        upgradeRequirements: z
          .strictObject({
            materials: ItemAmountSchema.array().nullable(),
            blueprints: ItemAmountSchema.array().nullable(),
          })
          .nullable(),
      })
      .array(),
  });
}
