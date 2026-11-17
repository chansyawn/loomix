import { z } from "zod";
import { IdSchema, NullableTextSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
import { BodyTypeSchema } from "../catalog/items.ts";

export const StoryLayoutSchema = z.enum([
  "text",
  "image",
  "portrait-image",
  "image-left",
  "image-right",
]);
export type StoryLayout = z.infer<typeof StoryLayoutSchema>;

export const StoryParagraphSchema = z
  .strictObject({
    text: z.string().nullable(),
    image: ImageRefSchema.nullable(),
    layout: StoryLayoutSchema,
  })
  .superRefine((paragraph, ctx) => {
    const hasText = Boolean(paragraph.text?.trim());
    const needsText = ["text", "image-left", "image-right"].includes(paragraph.layout);
    if (hasText !== needsText)
      ctx.addIssue({ code: "custom", path: ["text"], message: "Story text contradicts layout" });
    if (paragraph.layout === "text" && paragraph.image !== null)
      ctx.addIssue({
        code: "custom",
        path: ["image"],
        message: "Text layout cannot have an image",
      });
  });

export const GiftLevelSchema = z.enum(["love", "favor", "dislike"]);
const gift = z.strictObject({ itemIds: IdSchema.array(), tagIds: IdSchema.array() });

export const NeighborSchema = z.strictObject({
  id: IdSchema,
  name: z.string().min(1),
  bodyType: BodyTypeSchema.nullable(),
  profile: z.strictObject({
    englishName: NullableTextSchema,
    nickname: NullableTextSchema,
    birthday: z
      .strictObject({
        month: z.number().int().min(1).max(12),
        day: z.number().int().min(1).max(31),
      })
      .nullable(),
  }),
  images: z.strictObject({
    favour: ImageRefSchema.nullable(),
    role: ImageRefSchema.nullable(),
  }),
  stars: z
    .strictObject({
      name: z.string().min(1),
      galaxy: NullableTextSchema,
      image: ImageRefSchema.nullable(),
    })
    .array(),
  abilities: z
    .strictObject({
      unlockLevel: IdSchema,
      name: NullableTextSchema,
      description: NullableTextSchema,
    })
    .array(),
  house: z
    .strictObject({
      stages: z
        .strictObject({
          id: IdSchema,
          level: IdSchema,
          name: z.string().min(1),
          description: NullableTextSchema,
          image: ImageRefSchema.nullable(),
        })
        .array()
        .min(1),
    })
    .nullable(),
  stories: z
    .strictObject({
      chapter: z.number().int().positive(),
      title: z.string().min(1),
      paragraphs: StoryParagraphSchema.array().min(1),
    })
    .array(),
  gifts: z.strictObject({ love: gift, favor: gift, dislike: gift }),
});

export const NeighborsSchema = z.strictObject({ neighbors: NeighborSchema.array() });
export type Neighbor = z.infer<typeof NeighborSchema>;
export type Neighbors = z.infer<typeof NeighborsSchema>;
export type GiftLevel = z.infer<typeof GiftLevelSchema>;
export const parseNeighbors = (input: unknown): Neighbors => NeighborsSchema.parse(input);
