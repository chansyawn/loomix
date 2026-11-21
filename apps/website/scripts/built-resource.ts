import { readFile } from "node:fs/promises";
import { verifyPublishedMarker } from "@loomix/resources/release";
import { z } from "zod";

export const builtResourceFile = "resource-version.json";
const pointerSchema = z.strictObject({ resourceBaseUrl: z.string() });

export async function verifyBuiltResource(request: typeof fetch = fetch): Promise<string> {
  const file = new URL(`../dist/client/${builtResourceFile}`, import.meta.url);
  const { resourceBaseUrl } = pointerSchema.parse(JSON.parse(await readFile(file, "utf8")));
  await verifyPublishedMarker(resourceBaseUrl, request);
  return resourceBaseUrl;
}

if (import.meta.main) await verifyBuiltResource();
