import path from "node:path";
import { verifyBundle } from "../verify/bundle.ts";
import { parseRawContent } from "./schemas/raw-content.ts";
import { verifyCollection } from "../verify/collection.ts";
import { readJson } from "../workflow/json.ts";
import type { CatalogV5 } from "@loomix/content-schema/v5";

export async function verifyExtraction(work: string, writeReports = true): Promise<void> {
  const collection = readJson<CatalogV5>(path.join(work, "raw/images-content-v5.json"));
  await verifyBundle({
    reportRoot: work,
    bundle: work,
    staging: path.join(work, "raw"),
    contentFile: path.join(work, "raw", "images-content.json"),
    raw: true,
    parse: parseRawContent,
    writeReports,
    extraImages: collection.cropSeeds.flatMap((seed) => (seed.image ? [seed.image] : [])),
  });
  await verifyCollection(work, work, true, writeReports);
}
