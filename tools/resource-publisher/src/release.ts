import { createHash } from "node:crypto";
import {
  assembleRelease,
  parseReleaseManifest,
  ReleaseIdSchema,
  ReleaseMarkerSchema,
} from "@loomix/schema/release";
import type { DocumentKind, Release } from "@loomix/schema/release";

export {
  ReleaseIdSchema as releaseIdSchema,
  ReleaseMarkerSchema as releaseMarkerSchema,
} from "@loomix/schema/release";
export type { ReleaseMarker } from "@loomix/schema/release";
export const immutableCacheControl = "public, max-age=31536000, immutable";
export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
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
  )
    throw new Error("Resource base must be an HTTPS URL ending in /releases/<release-id>/");
  ReleaseIdSchema.parse(match[1]);
  return base;
}

export async function downloadRelease(
  value: string,
  request: typeof fetch = fetch,
): Promise<Release> {
  const base = parseReleaseBase(value);
  const fetchFile = async (name: string): Promise<Buffer> => {
    const response = await request(new URL(name, base), {
      signal: AbortSignal.timeout(30_000),
      headers: { Origin: "https://loomix.fun" },
    });
    if (!response.ok) throw new Error(`Resource ${name} returned HTTP ${response.status}`);
    const origin = response.headers.get("access-control-allow-origin");
    if (origin !== "*" && origin !== "https://loomix.fun")
      throw new Error(`Resource ${name} is missing website CORS access`);
    return Buffer.from(await response.arrayBuffer());
  };
  const marker = ReleaseMarkerSchema.parse(
    JSON.parse((await fetchFile("_complete.json")).toString("utf8")),
  );
  if (base.pathname !== `/releases/${marker.release}/`)
    throw new Error("Resource release marker does not match the configured URL");
  const bytes = await fetchFile("release.json");
  if (sha256(bytes) !== marker.manifestSha256) throw new Error("Release manifest SHA-256 mismatch");
  const manifest = parseReleaseManifest(JSON.parse(bytes.toString("utf8")));
  const documents = new Map<DocumentKind, unknown>();
  await Promise.all(
    manifest.files.map(async (file) => {
      const bytes = await fetchFile(file.path);
      if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
        throw new Error(`Document SHA-256 or size mismatch: ${file.path}`);
      documents.set(file.kind, JSON.parse(bytes.toString("utf8")));
    }),
  );
  return assembleRelease(manifest, documents);
}
