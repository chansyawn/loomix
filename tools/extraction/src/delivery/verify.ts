import path from "node:path";
import { parseCatalog } from "@loomix/content-schema";
import { verifyBundle } from "../verify/bundle.ts";
import { parseCatalogV4, projectLegacyCatalog } from "@loomix/content-schema/v4";
import { readJson } from "../workflow/json.ts";
import { verifyCollection } from "../verify/collection.ts";

export async function verifyDelivery(
  work: string,
  bundle: string,
  writeReports = true,
): Promise<void> {
  const input = readJson<{ schemaVersion: number }>(path.join(work, "staging/content.json"));
  const collection = input.schemaVersion === 4 ? parseCatalogV4(input) : null;
  await verifyBundle({
    reportRoot: work,
    bundle,
    staging: path.join(work, "staging"),
    contentFile: path.join(work, "staging", "content.json"),
    raw: false,
    parse: collection ? (input) => projectLegacyCatalog(parseCatalogV4(input)) : parseCatalog,
    writeReports,
    extraImages: collection?.cropSeeds.flatMap((seed) => (seed.image ? [seed.image] : [])),
  });
  if (collection) await verifyCollection(bundle, work, false, writeReports);
}
