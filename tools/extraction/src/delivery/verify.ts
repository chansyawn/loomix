import path from "node:path";
import { verifyBundle } from "../verify/bundle.ts";
import { parseCatalogV5, projectLegacyCatalogV5 } from "@loomix/content-schema/v5";
import { readJson } from "../workflow/json.ts";
import { verifyCollection } from "../verify/collection.ts";

export async function verifyDelivery(
  work: string,
  bundle: string,
  writeReports = true,
): Promise<void> {
  const collection = parseCatalogV5(readJson(path.join(work, "staging/content.json")));
  await verifyBundle({
    reportRoot: work,
    bundle,
    staging: path.join(work, "staging"),
    contentFile: path.join(work, "staging", "content.json"),
    raw: false,
    parse: (input) => projectLegacyCatalogV5(parseCatalogV5(input)),
    writeReports,
    extraImages: [
      ...collection.cropSeeds.flatMap((seed) => [
        ...(seed.image ? [seed.image] : []),
        ...(seed.detail.growth?.stages?.flatMap((stage) => (stage.image ? [stage.image] : [])) ??
          []),
      ]),
      ...collection.details.flatMap(
        (detail) =>
          detail.growth?.stages?.flatMap((stage) => (stage.image ? [stage.image] : [])) ?? [],
      ),
    ],
  });
  await verifyCollection(bundle, work, false, writeReports);
}
