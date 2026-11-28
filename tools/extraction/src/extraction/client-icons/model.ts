import { z } from "zod";
import type { OriginalImage } from "../images/model.ts";

const id = z.number().int().positive();
const slot = z.strictObject({
  table: id,
  rowOffset: z.number().int().nonnegative(),
  field: z.number().int().nonnegative(),
  image: z
    .strictObject({
      reference: z.string().min(1),
      object: z.string().regex(/^[a-f0-9]{64}$/),
      method: z.enum(["exact_config_path", "unique_sprite_name", "configured_atlas_member"]),
    })
    .nullable(),
});
const entry = z.strictObject({ id, name: z.string().nullable(), icon: slot });
export const clientIconRecordsSchema = z.strictObject({
  effects: entry.array(),
  cookware: entry.array(),
  difficulties: entry.array(),
  habits: entry.array(),
  giftPreferences: entry.array(),
  omnidexTabs: entry.extend({ groupId: id, groupName: z.string().nullable() }).array(),
  furnitureCategories: z
    .strictObject({
      id,
      category: z.string().nullable(),
      subcategory: z.string().nullable(),
      name: z.string().nullable(),
      categoryIcon: slot,
      subcategoryIcon: slot,
    })
    .array(),
  clothingParts: entry.array(),
  dishes: z
    .strictObject({
      id,
      recipeId: id,
      effectIds: id.array(),
      cookwareId: id.nullable(),
      difficultyId: id.nullable(),
    })
    .array(),
});
export type ClientIconRecords = z.infer<typeof clientIconRecordsSchema>;
export type ClientIconSlot = z.infer<typeof slot>;
export type ClientIconImage = NonNullable<ClientIconSlot["image"]>;

export function clientIconSlots(records: ClientIconRecords): ClientIconSlot[] {
  const single = [
    ...records.effects,
    ...records.cookware,
    ...records.difficulties,
    ...records.habits,
    ...records.giftPreferences,
    ...records.omnidexTabs,
    ...records.clothingParts,
  ];
  return [
    ...single.map((entry) => entry.icon),
    ...records.furnitureCategories.flatMap((entry) => [entry.categoryIcon, entry.subcategoryIcon]),
  ];
}

export function assembleClientIcons(
  datasetId: string,
  records: ClientIconRecords,
  originals: readonly OriginalImage[],
) {
  const objects = new Set(originals.map((entry) => entry.object));
  for (const { image } of clientIconSlots(records))
    if (image && !objects.has(image.object))
      throw new Error(`Missing client icon original ${image.reference}`);
  return { version: 1, datasetId, ...records };
}
