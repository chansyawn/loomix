import assert from "node:assert/strict";
import path from "node:path";
import { parseDataset } from "@loomix/schema/dataset";
import { validateContent } from "@loomix/resource-publisher/validate";
import { readJson, writeJson } from "../workflow/json.ts";

export async function verifyDelivery(
  work: string,
  bundle: string,
  writeReports = true,
): Promise<void> {
  const content = await validateContent(path.join(work, "staging"));
  const dataset = parseDataset(readJson(path.join(bundle, "dataset.json")));
  assert.deepEqual(
    content.release.dataset,
    dataset,
    "Delivery must preserve the sealed domain dataset",
  );
  if (writeReports)
    writeJson(path.join(work, "validation.json"), {
      passed: true,
      snapshotId: dataset.context.snapshotId,
      records: dataset.catalog.entries.length,
      images: content.assets.length,
    });
}
