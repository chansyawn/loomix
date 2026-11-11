import { z } from "zod";
import { ContextSchema } from "../common/identity.ts";
import { ImageRefSchema } from "../assets/index.ts";
const neighborId = z.number().int().positive();
const path = z
  .string()
  .min(1)
  .refine(
    (value) => !value.includes("\\") && !value.startsWith("/") && !value.split("/").includes(".."),
    "Expected relative POSIX asset path",
  );

const record = z.strictObject({
  id: neighborId,
  name: z.string().min(1),
  bodyType: z.enum(["small", "medium", "big"]).nullable(),
  scaleValue: z.number().finite().nullable(),
  avatar: ImageRefSchema.nullable(),
  npc2Path: path,
});

const star = z.strictObject({
  key: z.string().min(1),
  neighborId: neighborId,
  galaxyName: z.string().nullable(),
  galaxyIndex: z.number().int().nonnegative().nullable(),
  systemIndex: z.number().int().nonnegative().nullable(),
  starIndex: z.number().int().nonnegative().nullable(),
  name: z.string().min(1),
  galaxyModelPath: path.nullable(),
  playerModelPath: path.nullable(),
  skyModelPath: path.nullable(),
  image: ImageRefSchema.nullable(),
});

export const StoryLayoutSchema = z.enum([
  "text",
  "image",
  "portrait-image",
  "image-left",
  "image-right",
]);
export type StoryLayout = z.infer<typeof StoryLayoutSchema>;

const storyParagraph = z
  .strictObject({
    sequence: z.number().int().positive(),
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

const story = z.strictObject({
  key: z.string().min(1),
  neighborId: neighborId,
  chapter: z.number().int().positive(),
  title: z.string().min(1),
  paragraphs: storyParagraph.array(),
});

const travelReaction = z.strictObject({
  key: z.string().min(1),
  neighborId: neighborId.nullable(),
  variantId: z.number().int().positive(),
  conditionType: z.string().nullable(),
  threshold: z.string().nullable(),
  resourceCategory: z.string().nullable(),
  secondaryThreshold: z.string().nullable(),
  reactionAsset: path.nullable(),
  text: z.string().nullable(),
});

const friendshipRule = z.strictObject({
  key: z.string().min(1),
  title: z.string().nullable(),
  text: z.string().min(1),
  category: z.string().nullable(),
  level: z.number().int().positive().nullable(),
});

const eventTag = z.strictObject({ key: z.string().min(1), text: z.string().min(1) });

const asset = z.strictObject({
  path,
  kind: z.enum([
    "house",
    "friendStar",
    "outfit",
    "hub",
    "favourMission",
    "storyEnv",
    "reaction",
    "other",
  ]),
  relatedNeighborIds: neighborId.array(),
});

const giftPreferenceLevel = z.enum(["love", "favor", "dislike"]);
const giftPreference = z.strictObject({
  key: z.string().min(1),
  neighborId,
  level: giftPreferenceLevel,
  itemIds: neighborId.array(),
  tagIds: neighborId.array(),
});

const outfitOffer = z.strictObject({
  id: neighborId,
  goodsGroupId: neighborId,
  configuredPrice: z.number().int().nonnegative(),
  currencyItemId: neighborId,
});

const outfit = z
  .strictObject({
    id: neighborId,
    name: z.string().min(1),
    relationship: z.enum(["matching", "neighbor-specific"]),
    neighborId: neighborId.nullable(),
    slotCode: neighborId,
    slotName: z.string().min(1),
    modelPaths: z.strictObject({
      small: path.nullable(),
      medium: path.nullable(),
      big: path.nullable(),
    }),
    playerItemId: neighborId.nullable(),
    playerItemName: z.string().min(1).nullable(),
    colors: z.string().min(1).array(),
    materials: z.string().min(1).array(),
    styles: z.string().min(1).array(),
    specialTags: z.string().min(1).array(),
    image: ImageRefSchema,
    description: z.string().nullable(),
    offers: outfitOffer.array(),
  })
  .superRefine((value, ctx) => {
    if (!value.modelPaths.small && !value.modelPaths.medium && !value.modelPaths.big)
      ctx.addIssue({
        code: "custom",
        path: ["modelPaths"],
        message: "At least one model size is required",
      });
    if (value.relationship === "matching" && value.playerItemId === null)
      ctx.addIssue({
        code: "custom",
        path: ["playerItemId"],
        message: "Matching outfits need an explicit player item",
      });
    if (value.relationship === "neighbor-specific" && value.neighborId === null)
      ctx.addIssue({
        code: "custom",
        path: ["neighborId"],
        message: "Neighbor-specific outfits need a neighbor",
      });
    const offerIds = value.offers.map((offer) => offer.id);
    if (new Set(offerIds).size !== offerIds.length)
      ctx.addIssue({ code: "custom", path: ["offers"], message: "Duplicate outfit offer ID" });
  });

export const NeighborSpecificImageCategorySchema = z.enum([
  "diaryIllustration",
  "diaryWatermark",
  "diarySticker",
  "starAtlasIcon",
]);
export const AdditionalNeighborImageCategorySchema = z.enum([
  "avatar",
  "card",
  "favour",
  "house",
  "island",
  "outline",
  "role",
  ...NeighborSpecificImageCategorySchema.options,
]);
export type AdditionalNeighborImageCategory = z.infer<typeof AdditionalNeighborImageCategorySchema>;

const additionalImage = z
  .strictObject({
    key: z.string().min(1),
    category: AdditionalNeighborImageCategorySchema,
    neighborId: neighborId.nullable(),
    image: ImageRefSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.neighborId === null &&
      NeighborSpecificImageCategorySchema.safeParse(value.category).success
    )
      ctx.addIssue({
        code: "custom",
        path: ["neighborId"],
        message: "Neighbor-specific images need a neighbor",
      });
  });

export const NeighborsSchema = ContextSchema.extend({
  kind: z.literal("neighbors"),
  neighbors: record.array(),
  stars: star.array(),
  stories: story.array(),
  travelReactions: travelReaction.array(),
  friendshipRules: friendshipRule.array(),
  eventTags: eventTag.array(),
  giftPreferences: giftPreference.array().default([]),
  outfits: outfit.array().default([]),
  resources: asset.array(),
  additionalImages: additionalImage.array(),
});
export type Neighbors = z.infer<typeof NeighborsSchema>;
export type NeighborOutfit = z.infer<typeof outfit>;
export const parseNeighbors = (input: unknown): Neighbors => NeighborsSchema.parse(input);
