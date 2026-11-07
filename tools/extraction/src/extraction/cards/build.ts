import { investigateCardReferences } from "./investigation.ts";
import path from "node:path";
import type { ImageManifest, WorkOptions } from "../types.ts";
import type { ImageAsset } from "../images/export.ts";
import { exportImageAssets } from "../images/export.ts";
import { assetKey } from "../images/select.ts";
import { createContentContext } from "../content/context.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import { readCraftingCards } from "./read.ts";

export type CardImageExport = ImageAsset & {
  file: string;
  sha256: string;
  width: number;
  height: number;
};

export async function buildCards(options: WorkOptions): Promise<void> {
  const context = createContentContext(options.work);
  const data = readCraftingCards(context);
  const reusable = readJson<ImageManifest[]>(path.join(options.work, "image-candidates.json"));
  const available = new Map<string, CardImageExport>(
    reusable.map((image) => [assetKey(image), image]),
  );
  const selected: ImageAsset[] = [];
  const unresolved = [];
  for (const reference of new Set(data.imageReferences.map((entry) => entry.reference))) {
    const match = context.resolveIcon(reference);
    if (
      !match?.matched ||
      !match.resourceName ||
      !match.container ||
      !match.source ||
      !match.pathId
    ) {
      unresolved.push({ reference, reason: "no_exact_indexed_image_match" });
      continue;
    }
    selected.push({
      reference,
      assetType: match.assetType,
      resourceName: match.resourceName,
      container: match.container,
      source: match.source,
      pathId: match.pathId,
    });
  }
  const missing = selected.filter((image) => !available.has(assetKey(image)));
  for (const image of await exportImageAssets(options, missing, "card-exports"))
    available.set(assetKey(image), image);
  const images = selected.map((image) => ({
    ...available.get(assetKey(image))!,
    reference: image.reference,
  }));
  writeJson(path.join(options.work, "card-image-exports.json"), images);
  writeJson(path.join(options.work, "card-audit.json"), {
    investigation: investigateCardReferences(
      context.tables,
      new Set(data.cards.map((card) => card.id)),
    ),
    proofs: data.proofs,
    recipes: data.audit,
    imageReferences: data.imageReferences,
    images,
    unresolved,
  });
}
