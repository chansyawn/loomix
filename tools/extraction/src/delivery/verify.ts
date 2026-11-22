import assert from "node:assert/strict";
import path from "node:path";
import { parseExtractionDataset, publishedDataset } from "../extraction/dataset.ts";
import { validateContent } from "@loomix/resources/delivery";
import { readJson, writeJson } from "../workflow/json.ts";

export async function verifyDelivery(
  work: string,
  bundle: string,
  writeReports = true,
): Promise<void> {
  const content = await validateContent(path.join(work, "staging"));
  const { version } = readJson<{ version: unknown }>(path.join(bundle, "observations.json"));
  assert.ok(version === 1 || version === 2, "Supported source observation version");
  const dataset = publishedDataset(
    parseExtractionDataset(readJson(path.join(bundle, "dataset.json")), version),
  );
  assert.deepEqual(
    content.release.dataset,
    dataset,
    "Delivery must preserve the sealed domain dataset",
  );
  if (writeReports)
    writeJson(path.join(work, "validation.json"), {
      passed: true,
      snapshotId: dataset.context.snapshotId,
      items: dataset.catalog.items.length,
      images: content.assets.length,
    });
}
