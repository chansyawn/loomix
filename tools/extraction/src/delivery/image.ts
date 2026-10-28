import type { RecordType } from "@loomix/schema/extraction";
import sharp from "sharp";

export function imageDimensions(group: RecordType) {
  return group === "furniture.set" ? { width: 1024, height: 512 } : { width: 256, height: 256 };
}

export async function decodeWebp(bytes: Buffer) {
  const image = sharp(bytes, { failOn: "warning" });
  const metadata = await image.metadata();
  if (metadata.format !== "webp") throw new Error("Expected WebP image");
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (data.length !== info.width * info.height * 4) throw new Error("Incomplete WebP image");
  return info;
}

export async function processImage(bytes: Buffer, group: RecordType) {
  const dimensions = imageDimensions(group);
  const output = await sharp(bytes, { failOn: "warning" })
    .resize({ ...dimensions, fit: "cover", position: "centre", kernel: "lanczos3" })
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
