import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  AdditionalNeighborImageCategorySchema,
  type AdditionalNeighborImageCategory,
} from "./schema.ts";
import { readJson } from "../../workflow/json.ts";
import type { IndexedAsset } from "../types.ts";
import type { ImageAsset } from "../images/export.ts";

const selectionSchema = z.strictObject({
  category: AdditionalNeighborImageCategorySchema,
  npcId: z.number().int().positive().nullable(),
  assetType: z.enum(["Texture2D", "Sprite"]),
  resourceName: z.string().min(1),
  container: z.string().min(1),
  source: z.string().min(1),
  pathId: z.string().min(1),
});

const selectionsSchema = z.array(selectionSchema).superRefine((selections, ctx) => {
  const keys = new Set<string>();
  for (const [index, selection] of selections.entries()) {
    if (keys.has(selection.resourceName))
      ctx.addIssue({
        code: "custom",
        path: [index, "resourceName"],
        message: "Additional image resource names must be unique",
      });
    keys.add(selection.resourceName);
    if (index > 0 && selections[index - 1]!.resourceName >= selection.resourceName)
      ctx.addIssue({
        code: "custom",
        path: [index, "resourceName"],
        message: "Additional image selections must be sorted by resource name",
      });
  }
});

export type AdditionalNeighborImageSelection = z.infer<typeof selectionSchema>;
export type AdditionalNeighborImageAsset = ImageAsset & {
  category: AdditionalNeighborImageCategory;
  npcId: number | null;
};

const selectionFile = fileURLToPath(new URL("./additional-images.json", import.meta.url));

export function additionalNeighborImageSelections(): AdditionalNeighborImageSelection[] {
  return selectionsSchema.parse(readJson(selectionFile));
}

export function selectAdditionalNeighborImages(
  textures: IndexedAsset[],
  sprites: IndexedAsset[],
): AdditionalNeighborImageAsset[] {
  return additionalNeighborImageSelections().map((selection) => {
    const candidates = (selection.assetType === "Sprite" ? sprites : textures).filter(
      (asset) =>
        asset.Type === selection.assetType &&
        asset.Name === selection.resourceName &&
        asset.Container === selection.container &&
        asset.Source === selection.source &&
        asset.PathID === selection.pathId,
    );
    if (candidates.length !== 1)
      throw new Error(
        `Additional neighbor image index identity changed: ${selection.resourceName}`,
      );
    return {
      reference: selection.resourceName,
      assetType: selection.assetType,
      resourceName: selection.resourceName,
      container: selection.container,
      source: selection.source,
      pathId: selection.pathId,
      category: selection.category,
      npcId: selection.npcId,
    };
  });
}
