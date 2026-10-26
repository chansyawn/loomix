import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  neighborImagePaths,
  parseNeighborDatabase,
  parseNeighborImages,
  validateNeighborImages,
} from "@loomix/neighbor-schema";
import type { NeighborImageExport } from "../extraction/neighbors/images.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { processNeighborImage } from "./image.ts";

export async function renderNeighborImages(work: string, extraction: string): Promise<void> {
  const database = parseNeighborDatabase(readJson(path.join(extraction, "raw/neighbors.json")));
  const originals = readJson<NeighborImageExport[]>(
    path.join(extraction, "neighbor-image-exports.json"),
  );
  const processed = new Map<
    string,
    { file: string; width: number; height: number; sha256: string }
  >();
  const evidence = [];
  const images = [];
  for (const reference of neighborImagePaths(database)) {
    const original = originals.find((entry) => entry.reference === reference);
    if (!original) {
      images.push({ path: reference, image: null });
      continue;
    }
    let result = processed.get(original.sha256);
    if (!result) {
      const bytes = fs.readFileSync(path.join(extraction, original.file));
      if (crypto.createHash("sha256").update(bytes).digest("hex") !== original.sha256)
        throw new Error(`Neighbor original hash mismatch: ${reference}`);
      const image = await processNeighborImage(bytes);
      const sha256 = crypto.createHash("sha256").update(image.bytes).digest("hex");
      const file = `assets/${sha256}.webp`;
      fs.writeFileSync(path.join(work, "staging", file), image.bytes);
      result = { file, sha256, width: image.width, height: image.height };
      processed.set(original.sha256, result);
    }
    images.push({ path: reference, image: result.file });
    evidence.push({ path: reference, ...result, original });
  }
  const mapping = parseNeighborImages({ schemaVersion: 1, source: database.source, images });
  validateNeighborImages(database, mapping);
  writeJson(path.join(work, "staging/neighbor-images.json"), mapping);
  writeJson(path.join(work, "neighbor-image-manifest.json"), evidence);
}
