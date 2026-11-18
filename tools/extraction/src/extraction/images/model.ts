import { z } from "zod";
import { EvidenceSourceSchema } from "../evidence/domain-schema.ts";
import type { ImageRef } from "@loomix/schema/assets";
import type { EvidenceSource } from "../evidence/domain-schema.ts";
import { digest } from "../../workflow/hashing.ts";

export interface ImageObject {
  key: string;
  packageSha256: string;
  source: string;
  assetType: "Texture2D" | "Sprite";
  pathId: string;
  container: string;
  resourceName: string;
}
export interface ImageCandidate {
  object: string;
  reference: string;
  rank: number;
}
const ImageOwnerKindSchema = z.enum([
  "item",
  "collection",
  "seed",
  "stage",
  "neighbor",
  "neighborClothing",
  "starseaRegion",
  "starseaIsland",
  "starseaIconStyle",
]);
export interface ImageOwner {
  kind: z.infer<typeof ImageOwnerKindSchema>;
  id: number;
  field: string;
}
export interface ImageNeed {
  id: string;
  owner: ImageOwner;
  variant: ImageRef["variant"];
  required: boolean;
  candidates: ImageCandidate[];
  references: string[];
  sources: EvidenceSource[];
  reason: string;
}
export interface OriginalImage {
  object: string;
  file: string;
  sha256: string;
  width: number;
  height: number;
}
export interface ImageBinding {
  use: string;
  object: string | null;
  reason: string | null;
}
export interface ImageJob extends ImageRef {
  original: OriginalImage;
}

export function objectIdentity(packageSha256: string, assetType: string, pathId: string): string {
  if (!/^[a-f0-9]{64}$/.test(packageSha256)) throw new Error("Invalid package SHA256");
  if (assetType !== "Texture2D" && assetType !== "Sprite") throw new Error("Invalid image type");
  if (!/^(?:0|-?[1-9]\d*)$/.test(pathId)) throw new Error(`Noncanonical PathID: ${pathId}`);
  const id = BigInt(pathId);
  if (id < -(2n ** 63n) || id >= 2n ** 63n) throw new Error(`PathID out of range: ${pathId}`);
  return digest({ packageSha256, assetType, pathId });
}

export function uniqueObjects(objects: readonly ImageObject[]): ImageObject[] {
  const unique = new Map<string, ImageObject>();
  for (const object of objects) {
    if (object.key !== objectIdentity(object.packageSha256, object.assetType, object.pathId))
      throw new Error(`Invalid object identity ${object.key}`);
    const previous = unique.get(object.key);
    if (
      previous &&
      ["resourceName", "container", "assetType"].some(
        (key) => Reflect.get(previous, key) !== Reflect.get(object, key),
      )
    )
      throw new Error(`Conflicting object locator ${object.key}`);
    if (!previous || object.source < previous.source) unique.set(object.key, object);
  }
  return [...unique.values()].sort((a, b) => a.key.localeCompare(b.key));
}

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const originalImageSchema = z.strictObject({
  object: hashSchema,
  file: z.string().min(1),
  sha256: hashSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export const imageObjectSchema = z.strictObject({
  key: hashSchema,
  packageSha256: hashSchema,
  source: z.string().min(1),
  assetType: z.enum(["Sprite", "Texture2D"]),
  pathId: z.string().min(1),
  container: z.string().min(1),
  resourceName: z.string().min(1),
});
export const imageNeedSchema = z.strictObject({
  id: z.string().min(1),
  owner: z.strictObject({
    kind: ImageOwnerKindSchema,
    id: z.number().int().positive(),
    field: z.string().min(1),
  }),
  variant: z.enum(["icon", "banner", "illustration"]),
  required: z.boolean(),
  candidates: z
    .strictObject({
      object: hashSchema,
      reference: z.string().min(1),
      rank: z.number().int().nonnegative(),
    })
    .array(),
  references: z.string().min(1).array(),
  sources: EvidenceSourceSchema.array(),
  reason: z.string().min(1),
});
