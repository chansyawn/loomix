import { HashSchema, IdSchema } from "@loomix/schema/common";
import { z } from "zod";
import type { OriginalImage } from "../images/model.ts";

const config = z.strictObject({
  table: IdSchema,
  rowOffset: z.number().int().nonnegative(),
  field: z.number().int().nonnegative(),
  reference: z.string().min(1),
});
const slot = z.strictObject({
  resourceName: z.string().min(1),
  object: HashSchema,
  ownership: z.enum(["asset-name", "table-relation"]),
  configuration: config.array(),
});
const diaryKind = z.enum([
  "decoration",
  "page",
  "share",
  "book-large",
  "book-small",
  "letter",
  "text",
  "spine",
]);
const neighbor = z.strictObject({
  neighborId: IdSchema,
  name: z.string().min(1),
  socialAvatar: slot,
  interior: slot,
  blueprints: z
    .strictObject({ stageId: IdSchema, itemId: IdSchema, small: slot, large: slot })
    .array(),
  diary: slot.extend({ kind: diaryKind, sequence: IdSchema.nullable() }).array(),
});
export const neighborImageRecordsSchema = neighbor.array();
export type NeighborImageRecords = z.infer<typeof neighborImageRecordsSchema>;
export type NeighborImageSlot = z.infer<typeof slot>;
export type DiaryKind = z.infer<typeof diaryKind>;

export function neighborImageSlots(records: NeighborImageRecords): NeighborImageSlot[] {
  return records.flatMap(({ socialAvatar, interior, blueprints, diary }) => [
    socialAvatar,
    interior,
    ...blueprints.flatMap(({ small, large }) => [small, large]),
    ...diary,
  ]);
}

export function assembleNeighborImages(
  datasetId: string,
  neighbors: NeighborImageRecords,
  originals: readonly OriginalImage[],
) {
  const objects = new Set(originals.map((original) => original.object));
  for (const slot of neighborImageSlots(neighbors))
    if (!objects.has(slot.object))
      throw new Error(`Missing neighbor image original ${slot.resourceName}`);
  return { version: 1, datasetId, neighbors };
}
