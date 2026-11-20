import { z } from "zod";
import { HashSchema } from "../common/identity.ts";

export const AssetIdSchema = z.string().min(1);
export const ImageVariantSchema = z.enum(["icon", "banner", "illustration", "card-background"]);
export const ImageRefSchema = z.strictObject({
  assetId: AssetIdSchema,
  variant: ImageVariantSchema,
});
export const ImageFileSchema = z.string().regex(/^assets\/[a-f0-9]{64}\.webp$/);
export const SHARED_IMAGE_PREFIX = "images/";
export const SharedImageKeySchema = z
  .string()
  .regex(new RegExp(`^${SHARED_IMAGE_PREFIX}[a-f0-9]{64}\\.webp$`));
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
export const AssetsSchema = z.strictObject({ images: DeliveredImageSchema.array() });
export type ImageRef = z.infer<typeof ImageRefSchema>;
export type DeliveredImage = z.infer<typeof DeliveredImageSchema>;
export type Assets = z.infer<typeof AssetsSchema>;
export const parseAssets = (input: unknown): Assets => AssetsSchema.parse(input);
export const imageKey = (image: ImageRef): string => `${image.assetId}:${image.variant}`;

export function sharedImageKey(sha256: string): string {
  return `${SHARED_IMAGE_PREFIX}${HashSchema.parse(sha256)}.webp`;
}

export function sharedImagePath(file: string): string {
  const hash = ImageFileSchema.parse(file).slice("assets/".length, -".webp".length);
  return `/${sharedImageKey(hash)}`;
}

export function createImageResolver(assets: Assets): (image: ImageRef | null) => string | null {
  const index = new Map(assets.images.map((image) => [imageKey(image), image.file]));
  return (image) => (image === null ? null : (index.get(imageKey(image)) ?? null));
}
