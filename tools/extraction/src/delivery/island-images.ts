import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  islandImagePaths,
  parseIslandDatabase,
  parseIslandImages,
  validateIslandImages,
} from "@loomix/island-schema";
import type { IslandImageExport } from "../extraction/islands/images.ts";
import { readJson, writeJson } from "../workflow/json.ts";
import { within } from "../paths.ts";
import { processNeighborImage } from "./image.ts";

export async function renderIslandImages(work: string, extraction: string): Promise<void> {
  const database = parseIslandDatabase(readJson(path.join(extraction, "raw/islands.json")));
  const originals = readJson<IslandImageExport[]>(
    path.join(extraction, "island-image-exports.json"),
  );
  const byReference = new Map(originals.map((entry) => [entry.reference, entry]));
  const processed = new Map<string, string>();
  const images = [];
  const evidence = [];
  for (const reference of islandImagePaths(database)) {
    const original = byReference.get(reference);
    if (!original) {
      images.push({ path: reference, image: null });
      continue;
    }
    const bytes = fs.readFileSync(within(extraction, original.file));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== original.sha256)
      throw new Error(`Island original hash mismatch: ${reference}`);
    let file = processed.get(original.sha256);
    if (!file) {
      const image = await processNeighborImage(bytes);
      const sha256 = crypto.createHash("sha256").update(image.bytes).digest("hex");
      file = `assets/${sha256}.webp`;
      fs.writeFileSync(path.join(work, "staging", file), image.bytes);
      processed.set(original.sha256, file);
    }
    images.push({ path: reference, image: file });
    evidence.push({ path: reference, file, original });
  }
  const mapping = parseIslandImages({ schemaVersion: 1, source: database.source, images });
  validateIslandImages(database, mapping);
  fs.copyFileSync(
    path.join(extraction, "raw/islands.json"),
    path.join(work, "staging/islands.json"),
  );
  writeJson(path.join(work, "staging/islands-images.json"), mapping);
  writeJson(path.join(work, "island-image-manifest.json"), evidence);
}
