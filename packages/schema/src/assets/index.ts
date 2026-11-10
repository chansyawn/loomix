import { z } from "zod";
import { HashSchema, ContextSchema } from "../common/identity.ts";

export const AssetIdSchema = z.string().min(1);
export const ImageVariantSchema = z.enum(["icon", "banner", "illustration"]);
export const ImageRefSchema = z.strictObject({
  assetId: AssetIdSchema,
  variant: ImageVariantSchema,
});
export const ImageFileSchema = z.string().regex(/^assets\/[a-f0-9]{64}\.webp$/);
export const DeliveredImageSchema = ImageRefSchema.extend({
  file: ImageFileSchema,
  sha256: HashSchema,
  bytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).refine(
  (image) => image.file === `assets/${image.sha256}.webp`,
  "Image file must match its hash",
);
export const AssetsSchema = ContextSchema.extend({
  kind: z.literal("assets"),
  images: DeliveredImageSchema.array(),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;
export type DeliveredImage = z.infer<typeof DeliveredImageSchema>;
export type Assets = z.infer<typeof AssetsSchema>;
export const parseAssets = (input: unknown): Assets => AssetsSchema.parse(input);
export const imageKey = (image: ImageRef): string => `${image.assetId}:${image.variant}`;

export function createImageResolver(assets: Assets): (image: ImageRef | null) => string | null {
  const index = new Map(assets.images.map((image) => [imageKey(image), image.file]));
  return (image) => (image === null ? null : (index.get(imageKey(image)) ?? null));
}
