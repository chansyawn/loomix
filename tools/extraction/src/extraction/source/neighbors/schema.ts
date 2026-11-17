import { z } from "zod";
import { BodyTypeSchema } from "@loomix/schema/catalog";
import { StoryLayoutSchema } from "@loomix/schema/neighbors";

const source = z.strictObject({
  gameVersion: z.string().min(1),
  dataRevision: z.number().int().nonnegative(),
  resourceRevision: z.number().int().nonnegative(),
  manifestId: z.string().regex(/^\d+$/),
});

const neighborId = z.number().int().positive();
const path = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.includes("\\") && !value.startsWith("/") && !value.split("/").includes("../.."),
    "Expected relative POSIX asset path",
  );

const text = z.string().min(1).nullable();
const record = z.strictObject({
  id: neighborId,
  nameZh: z.string().min(1),
  bodyType: BodyTypeSchema.nullable(),
  profile: z.strictObject({
    englishName: text,
    nickname: text,
    birthday: z
      .strictObject({
        month: z.number().int().min(1).max(12),
        day: z.number().int().min(1).max(31),
      })
      .nullable(),
  }),
  abilities: z.strictObject({ unlockLevel: neighborId, name: text, description: text }).array(),
  house: z
    .strictObject({
      id: neighborId,
      stages: z
        .strictObject({
          id: neighborId,
          level: neighborId,
          name: z.string().min(1),
          description: text,
          image: path.nullable(),
        })
        .array(),
    })
    .nullable(),
});

const star = z.strictObject({
  key: z.string().min(1),
  npcId: neighborId,
  galaxyNameZh: z.string().nullable(),
  galaxyIndex: z.number().int().nonnegative().nullable(),
  systemIndex: z.number().int().nonnegative().nullable(),
  starIndex: z.number().int().nonnegative().nullable(),
  nameZh: z.string().min(1),
  illustrationPath: path.nullable(),
});

const story = z.strictObject({
  key: z.string().min(1),
  npcId: neighborId,
  chapter: z.number().int().positive(),
  titleZh: z.string().min(1),
  paragraphs: z
    .strictObject({
      sequence: z.number().int().positive(),
      bodyZh: z.string().nullable(),
      illustrationPath: path.nullable(),
      layout: StoryLayoutSchema,
    })
    .superRefine((paragraph, ctx) => {
      const needsText = ["text", "image-left", "image-right"].includes(paragraph.layout);
      if (Boolean(paragraph.bodyZh?.trim()) !== needsText)
        ctx.addIssue({
          code: "custom",
          path: ["bodyZh"],
          message: "Story text contradicts layout",
        });
      if ((paragraph.illustrationPath !== null) !== (paragraph.layout !== "text"))
        ctx.addIssue({
          code: "custom",
          path: ["illustrationPath"],
          message: "Story illustration contradicts layout",
        });
    })
    .array(),
});

const giftPreferenceLevel = z.enum(["love", "favor", "dislike"]);
const giftPreference = z.strictObject({
  key: z.string().min(1),
  npcId: neighborId,
  level: giftPreferenceLevel,
  itemIds: z.number().int().positive().array(),
  tagIds: z.number().int().positive().array(),
});

const outfitOffer = z.strictObject({
  id: z.number().int().positive(),
  configuredPrice: z.number().int().nonnegative(),
});

const outfit = z
  .strictObject({
    id: z.number().int().positive(),
    nameZh: z.string().min(1),
    relationship: z.enum(["matching", "neighbor-specific"]),
    neighborId: neighborId.nullable(),
    slotNameZh: z.string().min(1),
    bodyTypes: BodyTypeSchema.array().min(1),
    playerItemId: z.number().int().positive().nullable(),
    imagePath: path,
    descriptionZh: z.string().nullable(),
    offers: outfitOffer.array(),
  })
  .superRefine((value, ctx) => {
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

export const NeighborClothingDatabaseSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    source,
    items: outfit.array(),
  })
  .superRefine((database, ctx) => {
    const ids = database.items.map((item) => item.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", path: ["items"], message: "Duplicate neighbor clothing ID" });
    for (let index = 1; index < ids.length; index++)
      if (ids[index - 1]! >= ids[index]!)
        ctx.addIssue({ code: "custom", path: ["items"], message: "Items must be sorted by ID" });
  });

export const NeighborDatabaseSchema = z
  .strictObject({
    schemaVersion: z.literal(4),
    source,
    neighbors: record.array(),
    stars: star.array(),
    stories: story.array(),
    giftPreferences: giftPreference.array(),
  })
  .superRefine((database, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const assertSorted = <T>(
      values: T[],
      compare: (a: T, b: T) => number,
      pathValue: (string | number)[],
    ) => {
      for (let index = 1; index < values.length; index++)
        if (compare(values[index - 1]!, values[index]!) >= 0)
          issue(pathValue, "Values must be sorted and unique");
    };
    const numeric = (a: number, b: number) => a - b;
    assertSorted(
      database.neighbors.map((value) => value.id),
      numeric,
      ["neighbors"],
    );
    assertSorted(
      database.giftPreferences,
      (a, b) =>
        a.npcId - b.npcId ||
        ["love", "favor", "dislike"].indexOf(a.level) -
          ["love", "favor", "dislike"].indexOf(b.level),
      ["giftPreferences"],
    );
    assertSorted(
      database.stars,
      (a, b) =>
        a.npcId - b.npcId ||
        (a.galaxyIndex ?? 0) - (b.galaxyIndex ?? 0) ||
        (a.systemIndex ?? 0) - (b.systemIndex ?? 0) ||
        (a.starIndex ?? 0) - (b.starIndex ?? 0),
      ["stars"],
    );
    assertSorted(database.stories, (a, b) => a.npcId - b.npcId || a.chapter - b.chapter, [
      "stories",
    ]);
    for (const name of ["stars", "stories", "giftPreferences"] as const) {
      const keys = database[name].map((value) => value.key);
      if (new Set(keys).size !== keys.length) issue([name], "Duplicate key");
    }
    const known = new Set(database.neighbors.map((value) => value.id));
    for (const name of ["stars", "stories", "giftPreferences"] as const)
      database[name].forEach((value, index) => {
        if (!known.has(value.npcId)) issue([name, index, "npcId"], "Unknown neighbor");
      });
    database.giftPreferences.forEach((preference, index) => {
      if (preference.key !== `${preference.npcId}:${preference.level}`)
        issue(["giftPreferences", index, "key"], "Invalid preference key");
      assertSorted(preference.itemIds, numeric, ["giftPreferences", index, "itemIds"]);
      assertSorted(preference.tagIds, numeric, ["giftPreferences", index, "tagIds"]);
    });
    database.stories.forEach((value, index) => {
      if (!value.paragraphs.length) issue(["stories", index, "paragraphs"], "Empty story chapter");
      assertSorted(
        value.paragraphs.map((p) => p.sequence),
        numeric,
        ["stories", index, "paragraphs"],
      );
      if (value.key !== `${value.npcId}:${value.chapter}`)
        issue(["stories", index, "key"], "Invalid story key");
    });
  });

export type NeighborDatabase = z.infer<typeof NeighborDatabaseSchema>;
export type NeighborOutfit = z.infer<typeof outfit>;
export type NeighborClothingDatabase = z.infer<typeof NeighborClothingDatabaseSchema>;

export function parseNeighborDatabase(input: unknown): NeighborDatabase {
  return NeighborDatabaseSchema.parse(input);
}

export function parseNeighborClothingDatabase(input: unknown): NeighborClothingDatabase {
  return NeighborClothingDatabaseSchema.parse(input);
}

// 只保留网站展示的友邻补充图分类。
export const AdditionalNeighborImageCategorySchema = z.enum(["favour", "role"]);
export type AdditionalNeighborImageCategory = z.infer<typeof AdditionalNeighborImageCategorySchema>;

export function neighborImagePaths(database: NeighborDatabase): string[] {
  return [
    ...new Set(
      [
        ...database.neighbors.flatMap(
          (neighbor) => neighbor.house?.stages.map((stage) => stage.image) ?? [],
        ),
        ...database.stars.map((star) => star.illustrationPath),
        ...database.stories.flatMap((story) =>
          story.paragraphs.map((paragraph) => paragraph.illustrationPath),
        ),
      ].filter((value): value is string => value !== null),
    ),
  ].sort();
}
