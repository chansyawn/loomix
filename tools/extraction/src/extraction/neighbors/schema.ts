import { z } from "zod";
import { StoryLayoutSchema } from "@loomix/schema/neighbors";

type NeighborTravelReaction = {
  npcId: number | null;
  conditionType: string | null;
  threshold: string | null;
  resourceCategory: string | null;
  secondaryThreshold: string | null;
  reactionAsset: string | null;
  variantId: number;
};

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function compareReactions(a: NeighborTravelReaction, b: NeighborTravelReaction): number {
  return (
    (a.npcId ?? 0) - (b.npcId ?? 0) ||
    compareText(a.conditionType ?? "", b.conditionType ?? "") ||
    compareText(a.threshold ?? "", b.threshold ?? "") ||
    compareText(a.resourceCategory ?? "", b.resourceCategory ?? "") ||
    compareText(a.secondaryThreshold ?? "", b.secondaryThreshold ?? "") ||
    compareText(a.reactionAsset ?? "", b.reactionAsset ?? "") ||
    a.variantId - b.variantId
  );
}

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
    (value) => !value.includes("\\") && !value.startsWith("/") && !value.split("/").includes(".."),
    "Expected relative POSIX asset path",
  );

const record = z.strictObject({
  id: neighborId,
  nameZh: z.string().min(1),
  bodyType: z.enum(["small", "medium", "big"]).nullable(),
  scaleValue: z.number().finite().nullable(),
  avatarPath: path.nullable(),
  npc2Path: path,
  starKeys: z.string().array(),
  storyKeys: z.string().array(),
  assetPaths: path.array(),
});

const star = z.strictObject({
  key: z.string().min(1),
  npcId: neighborId,
  galaxyNameZh: z.string().nullable(),
  galaxyIndex: z.number().int().nonnegative().nullable(),
  systemIndex: z.number().int().nonnegative().nullable(),
  starIndex: z.number().int().nonnegative().nullable(),
  nameZh: z.string().min(1),
  galaxyModelPath: path.nullable(),
  playerModelPath: path.nullable(),
  skyModelPath: path.nullable(),
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

const travelReaction = z.strictObject({
  key: z.string().min(1),
  npcId: neighborId.nullable(),
  variantId: z.number().int().positive(),
  conditionType: z.string().nullable(),
  threshold: z.string().nullable(),
  resourceCategory: z.string().nullable(),
  secondaryThreshold: z.string().nullable(),
  reactionAsset: path.nullable(),
  textZh: z.string().nullable(),
});

const encounterIsland = z.strictObject({
  id: z.number().int().positive(),
  sceneId: z.number().int().positive(),
  nameZh: z.string().min(1),
  galaxyNameZh: z.string().nullable(),
  neighborIds: neighborId.array(),
  resourcePaths: path.array(),
  unlockCondition: z.string().nullable(),
  illustrationPath: path.nullable(),
});

const friendshipRule = z.strictObject({
  key: z.string().min(1),
  titleZh: z.string().nullable(),
  textZh: z.string().min(1),
  category: z.string().nullable(),
  level: z.number().int().positive().nullable(),
});

const eventTag = z.strictObject({ key: z.string().min(1), textZh: z.string().min(1) });

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
  npcId: neighborId,
  level: giftPreferenceLevel,
  itemIds: z.number().int().positive().array(),
  tagIds: z.number().int().positive().array(),
});

const outfitOffer = z.strictObject({
  id: z.number().int().positive(),
  goodsGroupId: z.number().int().positive(),
  configuredPrice: z.number().int().nonnegative(),
  currencyItemId: z.number().int().positive(),
});

const outfit = z
  .strictObject({
    id: z.number().int().positive(),
    nameZh: z.string().min(1),
    relationship: z.enum(["matching", "neighbor-specific"]),
    neighborId: neighborId.nullable(),
    slotCode: z.number().int().positive(),
    slotNameZh: z.string().min(1),
    modelPaths: z.strictObject({
      small: path.nullable(),
      medium: path.nullable(),
      big: path.nullable(),
    }),
    playerItemId: z.number().int().positive().nullable(),
    playerItemNameZh: z.string().min(1).nullable(),
    colors: z.string().min(1).array(),
    materials: z.string().min(1).array(),
    styles: z.string().min(1).array(),
    specialTags: z.string().min(1).array(),
    imagePath: path,
    descriptionZh: z.string().nullable(),
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

export const NeighborClothingDatabaseSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
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
    schemaVersion: z.literal(2),
    source,
    neighbors: record.array(),
    stars: star.array(),
    stories: story.array(),
    travelReactions: travelReaction.array(),
    encounterIslands: encounterIsland.array(),
    friendshipRules: friendshipRule.array(),
    eventTags: eventTag.array(),
    giftPreferences: giftPreference.array(),
    assets: asset.array(),
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
    for (const name of ["neighbors", "encounterIslands"] as const)
      assertSorted(
        database[name].map((value) => value.id),
        numeric,
        [name],
      );
    assertSorted(
      database.eventTags.map((value) => value.key),
      compareText,
      ["eventTags"],
    );
    assertSorted(
      database.assets.map((value) => value.path),
      compareText,
      ["assets"],
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
    assertSorted(database.travelReactions, compareReactions, ["travelReactions"]);
    for (const name of ["stars", "stories", "travelReactions", "friendshipRules"] as const) {
      const keys = database[name].map((value) => value.key);
      if (new Set(keys).size !== keys.length) issue([name], "Duplicate key");
    }
    const preferenceKeys = database.giftPreferences.map((value) => value.key);
    if (new Set(preferenceKeys).size !== preferenceKeys.length)
      issue(["giftPreferences"], "Duplicate key");
    const known = new Set(database.neighbors.map((value) => value.id));
    const checkIds = (ids: number[], path: (string | number)[]) => {
      assertSorted(ids, numeric, path);
      if (ids.some((id) => !known.has(id))) issue(path, "Unknown neighbor");
    };
    for (const name of ["stars", "stories", "travelReactions"] as const)
      database[name].forEach((value, index) => {
        if (value.npcId !== null && !known.has(value.npcId))
          issue([name, index, "npcId"], "Unknown neighbor");
      });
    for (const name of ["encounterIslands"] as const)
      database[name].forEach((value, index) =>
        checkIds(value.neighborIds, [name, index, "neighborIds"]),
      );
    database.assets.forEach((value, index) =>
      checkIds(value.relatedNeighborIds, ["assets", index, "relatedNeighborIds"]),
    );
    database.giftPreferences.forEach((preference, index) => {
      if (!known.has(preference.npcId))
        issue(["giftPreferences", index, "npcId"], "Unknown neighbor");
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
    database.travelReactions.forEach((value, index) => {
      if (value.key !== `${value.npcId ?? "fallback"}:${value.variantId}`)
        issue(["travelReactions", index, "key"], "Invalid reaction key");
      if (value.resourceCategory !== null && value.conditionType !== "Npc_Get_Items_Num_In_Travel")
        issue(["travelReactions", index, "resourceCategory"], "Unexpected resource category");
    });
    database.neighbors.forEach((neighbor, index) => {
      const expected = {
        starKeys: database.stars.filter((s) => s.npcId === neighbor.id).map((s) => s.key),
        storyKeys: database.stories.filter((s) => s.npcId === neighbor.id).map((s) => s.key),
        assetPaths: database.assets
          .filter((a) => a.relatedNeighborIds.includes(neighbor.id))
          .map((a) => a.path),
      };
      for (const key of ["starKeys", "storyKeys", "assetPaths"] as const)
        if (JSON.stringify(neighbor[key]) !== JSON.stringify(expected[key]))
          issue(["neighbors", index, key], "Incomplete or dangling association");
    });
    const assets = new Set(database.assets.map((a) => a.path));
    const checkPath = (path: string | null) => {
      if (path !== null && !assets.has(path))
        issue(["assets"], `Missing resource reference ${path}`);
    };
    for (const n of database.neighbors) {
      checkPath(n.avatarPath);
      checkPath(n.npc2Path);
    }
    for (const s of database.stars)
      for (const p of [s.galaxyModelPath, s.playerModelPath, s.skyModelPath, s.illustrationPath])
        checkPath(p);
    for (const s of database.stories) for (const p of s.paragraphs) checkPath(p.illustrationPath);
    for (const r of database.travelReactions) checkPath(r.reactionAsset);
    for (const i of database.encounterIslands) {
      checkPath(i.illustrationPath);
      i.resourcePaths.forEach(checkPath);
    }
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

export {
  AdditionalNeighborImageCategorySchema,
  type AdditionalNeighborImageCategory,
} from "@loomix/schema/neighbors";

export function neighborImagePaths(database: NeighborDatabase): string[] {
  return [
    ...new Set(
      [
        ...database.stars.map((star) => star.illustrationPath),
        ...database.stories.flatMap((story) =>
          story.paragraphs.map((paragraph) => paragraph.illustrationPath),
        ),
      ].filter((value): value is string => value !== null),
    ),
  ].sort();
}
