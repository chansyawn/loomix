import path from "node:path";
import { parseCatalog } from "@loomix/content-schema";
import { verifyBundle } from "../verify/bundle.ts";

export async function verifyDelivery(
  work: string,
  bundle: string,
  writeReports = true,
): Promise<void> {
  await verifyBundle({
    reportRoot: work,
    bundle,
    staging: path.join(work, "staging"),
    contentFile: path.join(work, "staging", "content.json"),
    raw: false,
    parse: parseCatalog,
    writeReports,
  });
}
