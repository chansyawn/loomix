import fs from "node:fs";
import path from "node:path";
import { ImageIndexSchema } from "@loomix/schema/assets";
import type { WebsiteImageFile } from "@loomix/schema/assets";
import {
  documentPath,
  parseWebsiteResources,
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceDocumentTypeSchema,
} from "@loomix/schema/website-resources";
import type { WebsiteResourceManifest } from "@loomix/schema/website-resources";
import type { VerifiedExtraction } from "../extraction/bundle.ts";
import { writeJson } from "../workflow/json.ts";
import { digest } from "../workflow/hashing.ts";
import { within } from "../paths.ts";
import { processImage } from "./image.ts";
import { IMAGE_PROCESSING_REPORT_FILE, WEBSITE_RESOURCE_DIRECTORY } from "./files.ts";

export async function renderImages(
  directory: string,
  extraction: Pick<VerifiedExtraction, "directory" | "dataset" | "imageJobs">,
): Promise<void> {
  const { dataset } = extraction;
  const jobs = extraction.imageJobs;
  const website = path.join(directory, WEBSITE_RESOURCE_DIRECTORY);
  fs.mkdirSync(path.join(website, "assets"), { recursive: true });
  const images = [];
  const imageProcessing = [];
  const processed = new Map<string, Omit<WebsiteImageFile, "assetId" | "variant">>();
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
      fs.writeFileSync(path.join(website, file), image.bytes);
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
    imageProcessing.push({ ...job, websiteImageFile: result });
  }
  const imageIndex = ImageIndexSchema.parse({ images });
  const documents = {
    "gameplay-tags": dataset.gameplayTags,
    catalog: dataset.catalog,
    neighbors: dataset.neighbors,
    starsea: dataset.starsea,
    vignettes: dataset.vignettes,
    "hair-dyeing": dataset.hairDyeing,
    "image-index": imageIndex,
  };
  const files: WebsiteResourceManifest["files"] = [];
  for (const kind of WebsiteResourceDocumentTypeSchema.options) {
    const file = documentPath(kind, dataset.context.locale);
    writeJson(path.join(website, file), documents[kind]);
    const bytes = fs.readFileSync(path.join(website, file));
    files.push({ kind, path: file, sha256: digest(bytes), bytes: bytes.length });
  }
  const manifest: WebsiteResourceManifest = { ...dataset.context, source: dataset.source, files };
  parseWebsiteResources({ manifest, dataset, imageIndex });
  writeJson(path.join(website, WEBSITE_RESOURCE_MANIFEST_FILE), manifest);
  writeJson(path.join(directory, IMAGE_PROCESSING_REPORT_FILE), imageProcessing);
}
