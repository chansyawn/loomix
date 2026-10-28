import fs from "node:fs";
import path from "node:path";
import { neighborImagePaths, parseNeighborDatabase } from "./schema.ts";
import { readJson, writeJson } from "../../workflow/json.ts";
import type { IndexedAsset, ImageManifest, WorkOptions } from "../types.ts";
import { createIconResolver } from "../images/resolve.ts";
import { exportImageAssets, type ImageAsset } from "../images/export.ts";
import { assetKey } from "../images/select.ts";
import {
  selectAdditionalNeighborImages,
  type AdditionalNeighborImageAsset,
} from "./additional-images.ts";

export type NeighborImageExport = ImageAsset & {
  file: string;
  sha256: string;
  width: number;
  height: number;
};

export type AdditionalNeighborImageExport = NeighborImageExport & {
  category: AdditionalNeighborImageAsset["category"];
  npcId: AdditionalNeighborImageAsset["npcId"];
};

export async function exportNeighborImages(options: WorkOptions): Promise<void> {
  const database = parseNeighborDatabase(readJson(path.join(options.work, "raw/neighbors.json")));
  const textures = readJson<IndexedAsset[]>(path.join(options.work, "prepared/textures.json"));
  const sprites = readJson<IndexedAsset[]>(path.join(options.work, "prepared/sprites.json"));
  const resolve = createIconResolver(textures, sprites);
  const reusable = readJson<ImageManifest[]>(path.join(options.work, "image-candidates.json"));
  const selected: ImageAsset[] = [];
  const unresolved: { path: string; reason: string }[] = [];
  for (const reference of neighborImagePaths(database)) {
    const match = resolve(reference);
    if (
      !match?.matched ||
      !match.resourceName ||
      !match.container ||
      !match.source ||
      !match.pathId
    ) {
      unresolved.push({ path: reference, reason: "No exact indexed resource match" });
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
  const additionalSelected = selectAdditionalNeighborImages(textures, sprites);
  const available = new Map<string, NeighborImageExport>(
    reusable.map((entry) => [assetKey(entry), entry]),
  );
  const missing = [...selected, ...additionalSelected].filter(
    (entry) => !available.has(assetKey(entry)),
  );
  fs.rmSync(path.join(options.work, "neighbor-exports"), { recursive: true, force: true });
  const exported = await exportImageAssets(options, missing, "neighbor-exports");
  for (const entry of exported) available.set(assetKey(entry), entry);
  const images: NeighborImageExport[] = selected.map((entry) => {
    const image = available.get(assetKey(entry));
    if (!image) throw new Error(`Missing neighbor export: ${entry.reference}`);
    return {
      ...entry,
      file: image.file,
      sha256: image.sha256,
      width: image.width,
      height: image.height,
    };
  });
  const additionalImages: AdditionalNeighborImageExport[] = additionalSelected.map((entry) => {
    const image = available.get(assetKey(entry));
    if (!image) throw new Error(`Missing additional neighbor export: ${entry.resourceName}`);
    return {
      ...entry,
      file: image.file,
      sha256: image.sha256,
      width: image.width,
      height: image.height,
    };
  });
  writeJson(path.join(options.work, "neighbor-image-exports.json"), images);
  writeJson(path.join(options.work, "neighbor-additional-image-exports.json"), additionalImages);
  writeJson(path.join(options.work, "neighbor-image-audit.json"), {
    source: database.source,
    references: neighborImagePaths(database).length,
    images,
    additionalImages,
    unresolved,
  });
}
