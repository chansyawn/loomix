import { readFile } from "node:fs/promises";
import { verifyPublishedManifest } from "@loomix/resources/release";
import { parseResourceAddressConfig } from "./resource-address-config.ts";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

export const builtResourceFile = "resource-version.json";

export function verifyResourceBinding(input: unknown, expectedResourceBaseUrl: string): string {
  const { resourceBaseUrl } = parseResourceAddressConfig(input);
  if (resourceBaseUrl !== expectedResourceBaseUrl) {
    throw new Error(
      `Website resource URL mismatch: expected ${expectedResourceBaseUrl}, found ${resourceBaseUrl}`,
    );
  }
  return resourceBaseUrl;
}

export async function verifyBuiltResource(
  request: typeof fetch = fetch,
  file = new URL(`../dist/client/${builtResourceFile}`, import.meta.url),
  expectedResourceBaseUrl = requireRemoteResources(resolveResourceConfig("production")),
) {
  const resourceBaseUrl = verifyResourceBinding(
    JSON.parse(await readFile(file, "utf8")),
    expectedResourceBaseUrl,
  );
  const { marker } = await verifyPublishedManifest(resourceBaseUrl, request);
  return { resourceBaseUrl, marker };
}

if (import.meta.main) {
  const { resourceBaseUrl, marker } = await verifyBuiltResource();
  console.log(`Verified built resource binding: ${resourceBaseUrl} (${marker.manifestSha256})`);
}
