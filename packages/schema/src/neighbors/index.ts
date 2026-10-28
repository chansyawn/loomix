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

const story = z.strictObject({
  key: z.string().min(1),
  neighborId: neighborId,
  chapter: z.number().int().positive(),
  title: z.string().min(1),
  paragraphs: z
    .strictObject({
      sequence: z.number().int().positive(),
      text: z.string().nullable(),
      image: ImageRefSchema.nullable(),
    })
    .array(),
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

const furnishingTheme = z.strictObject({
  id: z.number().int().positive().nullable(),
  key: z.string().min(1),
  name: z.string().min(1),
  neighborIds: neighborId.array(),
  description: z.string().nullable(),
  cardBagPath: path.nullable(),
  cardBackgroundPath: path.nullable(),
  cardBackPath: path.nullable(),
  topicIconPath: path.nullable(),
  lockedBackgroundPath: path.nullable(),
  unlockedBackgroundPath: path.nullable(),
  themePath: path.nullable(),
  cover: ImageRefSchema.nullable(),
});

const reward = z.strictObject({
  itemId: z.number().int().positive(),
  sources: z.string().min(1).array(),
  relatedNeighborIds: neighborId.array(),
});

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

export const NeighborsSchema = ContextSchema.extend({
  kind: z.literal("neighbors"),
  neighbors: record.array(),
  stars: star.array(),
  stories: story.array(),
  travelReactions: travelReaction.array(),
  friendshipRules: friendshipRule.array(),
  eventTags: eventTag.array(),
  furnishingThemes: furnishingTheme.array(),
  rewards: reward.array(),
  resources: asset.array(),
  additionalImages: z.array(
    z.strictObject({
      key: z.string().min(1),
      category: z.enum(["avatar", "card", "favour", "house", "island", "outline", "role"]),
      neighborId: neighborId.nullable(),
      image: ImageRefSchema,
    }),
  ),
});
export type Neighbors = z.infer<typeof NeighborsSchema>;
export const parseNeighbors = (input: unknown): Neighbors => NeighborsSchema.parse(input);
