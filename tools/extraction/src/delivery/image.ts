import type { ImageRef } from "@loomix/schema/assets";
import sharp from "sharp";

export function imageDimensions(variant: ImageRef["variant"]) {
  return variant === "banner" ? { width: 1024, height: 512 } : { width: 256, height: 256 };
}

export async function decodeWebp(bytes: Buffer) {
  const image = sharp(bytes, { failOn: "warning" });
  const metadata = await image.metadata();
  if (metadata.format !== "webp") throw new Error("Expected WebP image");
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (data.length !== info.width * info.height * 4) throw new Error("Incomplete WebP image");
  return info;
}

export async function processImage(bytes: Buffer, variant: ImageRef["variant"]) {
  if (variant === "illustration") return processNeighborImage(bytes);
  if (variant === "card-background") {
    const output = await sharp(bytes, { failOn: "warning" })
      .webp({ quality: 85, alphaQuality: 100, effort: 4 })
      .toBuffer();
    const { width, height } = await decodeWebp(output);
    return { bytes: output, width, height };
  }
  const dimensions = imageDimensions(variant);
  const output = await sharp(bytes, { failOn: "warning" })
    .resize({
      ...dimensions,
      fit: "cover",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .webp({ quality: 85, alphaQuality: 100, effort: 4 })
    .toBuffer();
  const decoded = await decodeWebp(output);
  if (decoded.width !== dimensions.width || decoded.height !== dimensions.height)
    throw new Error("Unexpected processed image dimensions");
  return { bytes: output, ...dimensions };
}

export async function processNeighborImage(bytes: Buffer) {
  const output = await sharp(bytes, { failOn: "warning" })
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    })
    .webp({ quality: 85, alphaQuality: 100, effort: 4 })
    .toBuffer();
  const { width, height } = await decodeWebp(output);
  return { bytes: output, width, height };
}
