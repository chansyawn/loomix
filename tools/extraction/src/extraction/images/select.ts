import type { SelectedImage, ImageManifest } from "../types.ts";

export const assetKey = (asset: SelectedImage | ImageManifest) =>
  `${asset.source}|${asset.assetType}|${asset.pathId}`;

export function highestResolutionImages(
  candidates: SelectedImage[],
  images: ImageManifest[],
): SelectedImage[] {
  const dimensions = new Map(images.map((image) => [assetKey(image), image]));
  const selected = new Map<number, SelectedImage>();
  for (const candidate of candidates) {
    const image = dimensions.get(assetKey(candidate));
    if (!image) throw new Error(`Missing candidate image: ${candidate.reference}`);
    const previous = selected.get(candidate.id);
    const priorImage = previous ? dimensions.get(assetKey(previous))! : null;
    if (!priorImage || image.width * image.height > priorImage.width * priorImage.height)
      selected.set(candidate.id, candidate);
  }
  return [...selected.values()];
}
