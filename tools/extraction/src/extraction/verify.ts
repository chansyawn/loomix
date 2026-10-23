import path from "node:path";
import { verifyBundle } from "../verify/bundle.ts";
import { parseRawContent } from "./schemas/raw-content.ts";

export async function verifyExtraction(work: string, writeReports = true): Promise<void> {
  await verifyBundle({
    reportRoot: work,
    bundle: work,
    staging: path.join(work, "raw"),
    contentFile: path.join(work, "raw", "images-content.json"),
    raw: true,
    parse: parseRawContent,
    writeReports,
  });
}
