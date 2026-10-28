import assert from "node:assert/strict";
import { parseDataset } from "@loomix/schema/dataset";
import { EvidenceSchema } from "./evidence/domain-schema.ts";
import { buildDataset } from "../domains/build.ts";
import { readDomainEvidence } from "../domains/evidence.ts";
import path from "node:path";
import { verifyBundle } from "../verify/bundle.ts";
import { parseRawContent } from "./schemas/raw-content.ts";
import { verifyCollection } from "../verify/collection.ts";
import { readJson } from "../workflow/json.ts";
import type { CollectionObservations } from "./schema.ts";

export async function verifyExtraction(work: string, writeReports = true): Promise<void> {
  const collection = readJson<CollectionObservations>(
    path.join(work, "raw/images-catalog-observations.json"),
  );
  await verifyBundle({
    reportRoot: work,
    bundle: work,
    staging: path.join(work, "raw"),
    contentFile: path.join(work, "raw", "images-content.json"),
    parse: parseRawContent,
    writeReports,
    extraImages: collection.cropSeeds.flatMap((seed) => (seed.image ? [seed.image] : [])),
  });
  await verifyCollection(work, work, writeReports);
  const rebuilt = buildDataset(work);
  assert.deepEqual(
    parseDataset(readJson(path.join(work, "dataset.json"))),
    rebuilt.dataset,
    "Dataset must match its frozen source observations",
  );
  assert.deepEqual(
    readJson(path.join(work, "image-jobs.json")),
    rebuilt.jobs,
    "Image jobs must match the complete reference graph",
  );
  assert.deepEqual(
    EvidenceSchema.parse(readJson(path.join(work, "evidence/domain-fields.json"))),
    readDomainEvidence(work, rebuilt.dataset),
    "Domain evidence must match the frozen source evidence",
  );
}
