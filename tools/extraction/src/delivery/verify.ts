import assert from "node:assert/strict";
import path from "node:path";
import { parseDataset } from "@loomix/schema/dataset";
import { validateContent } from "@loomix/resources/delivery";
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
      items: dataset.catalog.items.length,
      images: content.assets.length,
    });
}
