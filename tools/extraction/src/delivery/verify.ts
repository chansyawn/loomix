import path from "node:path";
import { verifyBundle } from "../verify/bundle.ts";
import { parseCatalogV4, projectLegacyCatalog } from "@loomix/content-schema/v4";
import { readJson } from "../workflow/json.ts";
import { verifyCollection } from "../verify/collection.ts";

export async function verifyDelivery(
  work: string,
  bundle: string,
  writeReports = true,
): Promise<void> {
  const collection = parseCatalogV4(readJson(path.join(work, "staging/content.json")));
  await verifyBundle({
    reportRoot: work,
    bundle,
    staging: path.join(work, "staging"),
    contentFile: path.join(work, "staging", "content.json"),
    raw: false,
    parse: (input) => projectLegacyCatalog(parseCatalogV4(input)),
    writeReports,
    extraImages: collection.cropSeeds.flatMap((seed) => (seed.image ? [seed.image] : [])),
  });
  await verifyCollection(bundle, work, false, writeReports);
}
