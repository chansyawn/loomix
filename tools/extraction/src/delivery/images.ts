import fs from "node:fs";
import path from "node:path";
import { parseDataset } from "@loomix/schema/dataset";
import { AssetsSchema } from "@loomix/schema/assets";
import { documentPath, parseRelease } from "@loomix/schema/release";
import type { ReleaseManifest, DocumentKind } from "@loomix/schema/release";
import type { WorkOptions } from "../extraction/types.ts";
import type { VerifiedExtraction } from "../extraction/bundle.ts";
import { writeJson } from "../workflow/json.ts";
import { digest } from "../workflow/hashing.ts";
import { within } from "../paths.ts";
import { processImage } from "./image.ts";
import { publishedDataset } from "../extraction/dataset.ts";

export async function renderImages(
  options: WorkOptions,
  extraction: Pick<VerifiedExtraction, "directory" | "dataset" | "imageJobs">,
): Promise<void> {
  const dataset = parseDataset(publishedDataset(extraction.dataset));
  const jobs = extraction.imageJobs;
  const staging = path.join(options.work, "staging");
  fs.mkdirSync(path.join(staging, "assets"), { recursive: true });
  const images = [];
  const evidence = [];
  const processed = new Map<
    string,
    { file: string; sha256: string; bytes: number; width: number; height: number }
  >();
  for (const job of jobs) {
    const bytes = fs.readFileSync(within(extraction.directory, job.original.file));
    if (digest(bytes) !== job.original.sha256)
      throw new Error(`Original image hash mismatch ${job.assetId}`);
    const key = `${job.original.sha256}:${job.variant}`;
    let result = processed.get(key);
    if (!result) {
      const image = await processImage(bytes, job.variant);
      const sha256 = digest(image.bytes);
      const file = `assets/${sha256}.webp`;
      fs.writeFileSync(path.join(staging, file), image.bytes);
      result = {
        file,
        sha256,
        bytes: image.bytes.length,
        width: image.width,
        height: image.height,
      };
      processed.set(key, result);
    }
    images.push({ assetId: job.assetId, variant: job.variant, ...result });
    evidence.push({ ...job, delivered: result });
  }
  const assets = AssetsSchema.parse({ images });
  const documents = {
    "gameplay-tags": dataset.gameplayTags,
    catalog: dataset.catalog,
    neighbors: dataset.neighbors,
    starsea: dataset.starsea,
    assets,
  };
  const files: ReleaseManifest["files"] = [];
  for (const kind of Object.keys(documents) as DocumentKind[]) {
    const file = documentPath(kind, dataset.context.locale);
    writeJson(path.join(staging, file), documents[kind]);
    const bytes = fs.readFileSync(path.join(staging, file));
    files.push({ kind, path: file, sha256: digest(bytes), bytes: bytes.length });
  }
  const manifest: ReleaseManifest = { ...dataset.context, source: dataset.source, files };
  parseRelease({ manifest, dataset, assets });
  writeJson(path.join(staging, "release.json"), manifest);
  writeJson(path.join(options.work, "image-manifest.json"), evidence);
}
