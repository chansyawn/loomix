import { z } from "zod";
import { NeighborDatabaseSchema, type NeighborDatabase } from "./schema.ts";

export const AdditionalNeighborImageCategorySchema = z.enum([
  "avatar",
  "card",
  "favour",
  "house",
  "island",
  "outline",
  "role",
]);

export const AdditionalNeighborImageSchema = z.strictObject({
  key: z.string().min(1),
  category: AdditionalNeighborImageCategorySchema,
  npcId: z.number().int().positive().nullable(),
  image: z.string().regex(/^assets\/[a-f0-9]{64}\.webp$/),
});

export const NeighborImagesSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    source: NeighborDatabaseSchema.shape.source,
    images: z.array(
      z.strictObject({
        path: z
          .string()
          .min(1)
          .refine(
            (value) =>
              !value.includes(String.fromCharCode(92)) &&
              !value.startsWith("/") &&
              !value.split("/").includes(".."),
            "Expected relative POSIX asset path",
          ),
        image: z
          .string()
          .regex(/^assets\/[a-f0-9]{64}\.webp$/)
          .nullable(),
      }),
    ),
    additionalImages: z.array(AdditionalNeighborImageSchema).optional(),
  })
  .superRefine((mapping, ctx) => {
    for (let index = 1; index < mapping.images.length; index++)
      if (mapping.images[index - 1]!.path >= mapping.images[index]!.path)
        ctx.addIssue({
          code: "custom",
          path: ["images", index],
          message: "Paths must be sorted and unique",
        });
    for (let index = 1; index < (mapping.additionalImages?.length ?? 0); index++)
      if (mapping.additionalImages![index - 1]!.key >= mapping.additionalImages![index]!.key)
        ctx.addIssue({
          code: "custom",
          path: ["additionalImages", index],
          message: "Additional image keys must be sorted and unique",
        });
  });

export type NeighborImages = z.infer<typeof NeighborImagesSchema>;
export type AdditionalNeighborImage = z.infer<typeof AdditionalNeighborImageSchema>;
export type AdditionalNeighborImageCategory = z.infer<typeof AdditionalNeighborImageCategorySchema>;

export function neighborImagePaths(database: NeighborDatabase): string[] {
  return [
    ...new Set(
      [
        ...database.stars.map((star) => star.illustrationPath),
        ...database.stories.flatMap((story) =>
          story.paragraphs.map((paragraph) => paragraph.illustrationPath),
        ),
        ...database.furnishingThemes.map((theme) => theme.coverPath),
      ].filter((value): value is string => value !== null),
    ),
  ].sort();
}

export function parseNeighborImages(input: unknown): NeighborImages {
  return NeighborImagesSchema.parse(input);
}

export function validateNeighborImages(database: NeighborDatabase, images: NeighborImages): void {
  for (const key of ["gameVersion", "dataRevision", "resourceRevision", "manifestId"] as const)
    if (database.source[key] !== images.source[key])
      throw new Error("Neighbor image source does not match neighbors.json");
  if (
    JSON.stringify(neighborImagePaths(database)) !==
    JSON.stringify(images.images.map((entry) => entry.path))
  )
    throw new Error("Neighbor image mapping must cover exactly the referenced paths");
}
