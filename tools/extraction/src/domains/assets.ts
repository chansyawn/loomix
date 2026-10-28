import type { ImageRef } from "@loomix/schema/assets";
import type { RecordType } from "../extraction/schema.ts";
import { digest } from "../workflow/hashing.ts";

export interface OriginalImage {
  file: string;
  sha256: string;
  width: number;
  height: number;
  source: string;
  container: string;
  assetType: string;
  pathId: string;
}
export interface ImageJob extends ImageRef {
  original: OriginalImage;
  group: RecordType | null;
}

export function createAssetRegistry() {
  const jobs = new Map<string, ImageJob>();
  const files = new Map<string, ImageRef>();
  const register = (original: OriginalImage, group: RecordType | null = null): ImageRef => {
    const assetId = digest({
      source: original.source,
      container: original.container,
      assetType: original.assetType,
      pathId: original.pathId,
    });
    const variant = group === "furniture.set" ? "banner" : group ? "icon" : "illustration";
    const key = `${assetId}:${variant}`;
    const previous = jobs.get(key);
    if (previous && previous.original.sha256 !== original.sha256)
      throw new Error(`Conflicting original image ${key}`);
    const image = { assetId, variant } as const;
    jobs.set(key, { ...image, original, group });
    files.set(`${original.file}:${variant}`, image);
    return image;
  };
  const image = (file: string | null, variant: ImageRef["variant"] = "icon"): ImageRef | null => {
    if (file === null) return null;
    const value = files.get(`${file}:${variant}`);
    if (!value) throw new Error(`Unregistered image ${file}`);
    return value;
  };
  return { jobs, register, image };
}
export type AssetRegistry = ReturnType<typeof createAssetRegistry>;
