import { createHash } from "node:crypto";
import { z } from "zod";
import { parseCatalogV4 } from "@loomix/content-schema/v4";
import {
  parseNeighborImages,
  validateNeighborImages,
  type NeighborImages,
  parseNeighborDatabase,
} from "@loomix/neighbor-schema";
import type { CatalogV4 } from "@loomix/content-schema/v4";
import {
  parseIslandDatabase,
  parseIslandImages,
  validateIslandCatalog,
  validateIslandImages,
} from "@loomix/island-schema";

export const releaseIdSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const releaseMarkerSchema = z
  .strictObject({
    release: releaseIdSchema,
    contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    neighborsSha256: z.string().regex(/^[a-f0-9]{64}$/),
    neighborImagesSha256: z.string().regex(/^[a-f0-9]{64}$/),
    islandsSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    islandsImagesSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    assetCount: z.number().int().nonnegative(),
    neighborCount: z.number().int().nonnegative(),
    islandCount: z.number().int().nonnegative().optional(),
  })
  .superRefine((marker, ctx) => {
    const fields = [marker.islandsSha256, marker.islandsImagesSha256, marker.islandCount];
    if (fields.some((field) => field !== undefined) && fields.some((field) => field === undefined))
      ctx.addIssue({ code: "custom", message: "Island release metadata must be complete" });
  });
export type ReleaseMarker = z.infer<typeof releaseMarkerSchema>;
export const immutableCacheControl = "public, max-age=31536000, immutable";

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function referencedImages(content: CatalogV4, neighbors?: NeighborImages): string[] {
  return [
    ...new Set([
      ...content.items.flatMap((record) => (record.image ? [record.image] : [])),
      ...content.cropSeeds.flatMap((seed) => (seed.image ? [seed.image] : [])),
      ...(neighbors?.images.flatMap((entry) => (entry.image ? [entry.image] : [])) ?? []),
      ...(neighbors?.additionalImages?.map((entry) => entry.image) ?? []),
    ]),
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
  const content = parseCatalogV4(JSON.parse(bytes.toString("utf8")));
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
  const imageBytes = Buffer.from(await (await fetchFile("neighbor-images.json")).arrayBuffer());
  if (sha256(imageBytes) !== marker.neighborImagesSha256)
    throw new Error("Neighbor images SHA-256 does not match the completed release");
  const images = parseNeighborImages(JSON.parse(imageBytes.toString("utf8")));
  validateNeighborImages(neighbors, images);
  const usedImages = new Set(referencedImages(content, images));
  // Older immutable releases predate island data; partial island metadata is rejected by the schema.
  if (marker.islandsSha256 !== undefined) {
    const islandsBytes = Buffer.from(await (await fetchFile("islands.json")).arrayBuffer());
    if (sha256(islandsBytes) !== marker.islandsSha256)
      throw new Error("Island JSON SHA-256 does not match the completed release");
    const islands = parseIslandDatabase(JSON.parse(islandsBytes.toString("utf8")));
    validateIslandCatalog(islands, content);
    if (islands.source.manifestId !== neighbors.source.manifestId)
      throw new Error("Island manifest does not match neighbors.json");
    if (islands.islands.length !== marker.islandCount)
      throw new Error("Resource island count does not match the completed release");
    const islandImagesBytes = Buffer.from(
      await (await fetchFile("islands-images.json")).arrayBuffer(),
    );
    if (sha256(islandImagesBytes) !== marker.islandsImagesSha256)
      throw new Error("Island images SHA-256 does not match the completed release");
    const mapping = parseIslandImages(JSON.parse(islandImagesBytes.toString("utf8")));
    validateIslandImages(islands, mapping);
    for (const image of mapping.images) if (image.image !== null) usedImages.add(image.image);
  }
  if (usedImages.size !== marker.assetCount)
    throw new Error("Resource image count does not match the completed release");
  return bytes;
}
