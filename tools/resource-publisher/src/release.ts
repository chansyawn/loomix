import { createHash } from "node:crypto";
import { z } from "zod";
import { parseCatalog } from "@loomix/content-schema";
import { parseNeighborDatabase } from "@loomix/neighbor-schema";
import type { Catalog } from "@loomix/content-schema";

export const releaseIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const releaseMarkerSchema = z.strictObject({
  release: releaseIdSchema,
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  neighborsSha256: z.string().regex(/^[a-f0-9]{64}$/),
  assetCount: z.number().int().nonnegative(),
  neighborCount: z.number().int().nonnegative(),
});
export type ReleaseMarker = z.infer<typeof releaseMarkerSchema>;
export const immutableCacheControl = "public, max-age=31536000, immutable";

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function referencedImages(content: Catalog): string[] {
  return [
    ...new Set(content.items.flatMap((record) => (record.image ? [record.image] : []))),
  ].sort();
}

export function parseReleaseBase(value: string): URL {
  const base = new URL(value);
  const match = /^\/releases\/([^/]+)\/$/.exec(base.pathname);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !match
  ) {
    throw new Error("Resource base must be an HTTPS URL ending in /releases/<release-id>/");
  }
  releaseIdSchema.parse(match[1]);
  return base;
}

export async function downloadRelease(
  value: string,
  request: typeof fetch = fetch,
): Promise<Buffer> {
  const base = parseReleaseBase(value);
  async function fetchFile(name: string): Promise<Response> {
    const response = await request(new URL(name, base), {
      signal: AbortSignal.timeout(30_000),
      headers: { Origin: "https://loomix.fun" },
    });
    if (!response.ok) throw new Error(`Resource ${name} returned HTTP ${response.status}`);
    const origin = response.headers.get("access-control-allow-origin");
    if (origin !== "*" && origin !== "https://loomix.fun") {
      throw new Error(`Resource ${name} is missing website CORS access`);
    }
    return response;
  }
  const marker = releaseMarkerSchema.parse(await (await fetchFile("_complete.json")).json());
  if (base.pathname !== `/releases/${marker.release}/`) {
    throw new Error("Resource release marker does not match the configured URL");
  }
  const bytes = Buffer.from(await (await fetchFile("content.json")).arrayBuffer());
  if (sha256(bytes) !== marker.contentSha256) {
    throw new Error("Resource JSON SHA-256 does not match the completed release");
  }
  const content = parseCatalog(JSON.parse(bytes.toString("utf8")));
  if (referencedImages(content).length !== marker.assetCount) {
    throw new Error("Resource image count does not match the completed release");
  }
  const neighborsBytes = Buffer.from(await (await fetchFile("neighbors.json")).arrayBuffer());
  if (sha256(neighborsBytes) !== marker.neighborsSha256) {
    throw new Error("Neighbor JSON SHA-256 does not match the completed release");
  }
  const neighbors = parseNeighborDatabase(JSON.parse(neighborsBytes.toString("utf8")));
  if (neighbors.neighbors.length !== marker.neighborCount) {
    throw new Error("Resource neighbor count does not match the completed release");
  }
  if (
    neighbors.source.gameVersion !== content.source.gameVersion ||
    neighbors.source.dataRevision !== content.source.dataRevision ||
    neighbors.source.resourceRevision !== content.source.resourceRevision
  ) {
    throw new Error("Neighbor database source does not match content.json");
  }
  return bytes;
}
