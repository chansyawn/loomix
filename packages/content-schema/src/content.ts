import { z } from "zod";
import { BasicRecordSchema, recordSchemas } from "./records.ts";
import type { ContentGroup, ContentRecord } from "./records.ts";

const ContentStructureSchema = z.strictObject({
  furniture: z.strictObject({
    sets: recordSchemas["furniture.sets"].array(),
    items: recordSchemas["furniture.items"].array(),
  }),
  creatures: z.strictObject({
    series: recordSchemas["creatures.series"].array(),
    items: recordSchemas["creatures.items"].array(),
  }),
  plants: z.strictObject({
    series: recordSchemas["plants.series"].array(),
    items: recordSchemas["plants.items"].array(),
  }),
  dishes: z.strictObject({
    series: recordSchemas["dishes.series"].array(),
    items: recordSchemas["dishes.items"].array(),
  }),
  clothing: z.strictObject({
    sets: recordSchemas["clothing.sets"].array(),
    items: recordSchemas["clothing.items"].array(),
    appearances: recordSchemas["clothing.appearances"].array(),
  }),
  miscellaneous: recordSchemas.miscellaneous.array(),
});

export type Content = z.infer<typeof ContentStructureSchema>;
export const basicFields = Object.keys(BasicRecordSchema.shape);
export const contentGroups = Object.keys(recordSchemas) as ContentGroup[];
export const additionalFields = Object.fromEntries(
  contentGroups.map((group) => [
    group,
    Object.keys(recordSchemas[group].shape).filter((field) => !basicFields.includes(field)),
  ]),
) as Record<ContentGroup, string[]>;

export const memberTargets = {
  "furniture.sets": ["componentIds", "furniture.items"],
  "creatures.series": ["creatureIds", "creatures.items"],
  "plants.series": ["plantIds", "plants.items"],
  "dishes.series": ["dishIds", "dishes.items"],
  "clothing.sets": ["componentIds", "clothing.items"],
} as const;

const groupReaders = {
  "furniture.sets": (content: Content) => content.furniture.sets,
  "furniture.items": (content: Content) => content.furniture.items,
  "creatures.series": (content: Content) => content.creatures.series,
  "creatures.items": (content: Content) => content.creatures.items,
  "plants.series": (content: Content) => content.plants.series,
  "plants.items": (content: Content) => content.plants.items,
  "dishes.series": (content: Content) => content.dishes.series,
  "dishes.items": (content: Content) => content.dishes.items,
  "clothing.sets": (content: Content) => content.clothing.sets,
  "clothing.items": (content: Content) => content.clothing.items,
  "clothing.appearances": (content: Content) => content.clothing.appearances,
  miscellaneous: (content: Content) => content.miscellaneous,
} satisfies Record<ContentGroup, (content: Content) => ContentRecord[]>;

export function groupAt<G extends ContentGroup>(content: Content, group: G): ContentRecord<G>[] {
  return groupReaders[group](content) as ContentRecord<G>[];
}

export function emptyContent(): Content {
  return {
    furniture: { sets: [], items: [] },
    creatures: { series: [], items: [] },
    plants: { series: [], items: [] },
    dishes: { series: [], items: [] },
    clothing: { sets: [], items: [], appearances: [] },
    miscellaneous: [],
  };
}

function memberIds(row: ContentRecord): number[] | null {
  if ("componentIds" in row) return row.componentIds;
  if ("creatureIds" in row) return row.creatureIds;
  if ("plantIds" in row) return row.plantIds;
  if ("dishIds" in row) return row.dishIds;
  return null;
}

export const ContentSchema = ContentStructureSchema.superRefine((content, ctx) => {
  const ids = new Set<number>();
  for (const group of contentGroups) {
    groupAt(content, group).forEach((row, index) => {
      if (ids.has(row.id)) {
        ctx.addIssue({
          code: "custom",
          path: [...group.split("."), index, "id"],
          message: `Duplicate content ID ${row.id}`,
        });
      }
      ids.add(row.id);
    });
  }
  for (const group of Object.keys(memberTargets) as (keyof typeof memberTargets)[]) {
    const [field, target] = memberTargets[group];
    const targetIds = new Set(groupAt(content, target).map((row) => row.id));
    groupAt(content, group).forEach((row, index) => {
      const seen = new Set<number>();
      (memberIds(row) ?? []).forEach((id, memberIndex) => {
        const path = [...group.split("."), index, field, memberIndex];
        if (seen.has(id)) {
          ctx.addIssue({ code: "custom", path, message: `Duplicate member ID ${id}` });
        }
        if (!targetIds.has(id)) {
          ctx.addIssue({ code: "custom", path, message: `Member ${id} must exist in ${target}` });
        }
        seen.add(id);
      });
    });
  }
});

export function parseContent(input: unknown): Content {
  return ContentSchema.parse(input);
}
