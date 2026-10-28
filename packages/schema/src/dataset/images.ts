import { ImageRefSchema, imageKey } from "../assets/index.ts";
import type { ImageRef } from "../assets/index.ts";
import type { Dataset } from "./index.ts";

export function referencedImages(
  dataset: Pick<Dataset, "catalog" | "neighbors" | "world">,
): ImageRef[] {
  const images = new Map<string, ImageRef>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if ("assetId" in value && "variant" in value) {
      const image = ImageRefSchema.parse(value);
      images.set(imageKey(image), image);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(dataset);
  return [...images.values()].sort((a, b) => imageKey(a).localeCompare(imageKey(b), "en"));
}
