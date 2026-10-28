import fs from "node:fs";
import path from "node:path";
import { islandImagePaths, parseIslandDatabase } from "@loomix/schema/extraction/islands";
import { readJson, writeJson } from "../../workflow/json.ts";
import type { IndexedAsset, WorkOptions } from "../types.ts";
import { createIslandImageResolver } from "./resolve-images.ts";
import { exportImageAssets, type ImageAsset } from "../images/export.ts";

export type IslandImageExport = ImageAsset & {
  file: string;
  sha256: string;
  width: number;
  height: number;
};

export async function exportIslandImages(options: WorkOptions): Promise<void> {
  const database = parseIslandDatabase(readJson(path.join(options.work, "raw/islands.json")));
  const textures = readJson<IndexedAsset[]>(path.join(options.work, "prepared/textures.json"));
  const sprites = readJson<IndexedAsset[]>(path.join(options.work, "prepared/sprites.json"));
  const resolve = createIslandImageResolver(textures, sprites);
  const selected: ImageAsset[] = [];
  const unresolved: { path: string; reason: string }[] = [];
  for (const reference of islandImagePaths(database)) {
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
  fs.rmSync(path.join(options.work, "island-exports"), { recursive: true, force: true });
  const exported = await exportImageAssets(options, selected, "island-exports");
  const byObject = new Map(
    exported.map((entry) => [`${entry.source}|${entry.assetType}|${entry.pathId}`, entry]),
  );
  const images: IslandImageExport[] = selected.map((entry) => {
    const original = byObject.get(`${entry.source}|${entry.assetType}|${entry.pathId}`);
    if (!original) throw new Error(`Missing island export ${entry.reference}`);
    return { ...original, ...entry };
  });
  writeJson(path.join(options.work, "island-image-exports.json"), images);
  writeJson(path.join(options.work, "island-image-audit.json"), {
    source: database.source,
    references: islandImagePaths(database).length,
    images,
    matches: selected.map((entry) => ({
      path: entry.reference,
      method: resolve(entry.reference)?.matchMethod,
    })),
    unresolved,
  });
}
