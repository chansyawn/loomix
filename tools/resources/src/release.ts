import { createHash } from "node:crypto";
import {
  assembleRelease,
  parseReleaseManifest,
  ReleaseIdSchema,
  ReleaseMarkerSchema,
} from "@loomix/schema/release";
import type { DocumentKind, Release, ReleaseMarker } from "@loomix/schema/release";
import { sharedImagePath } from "@loomix/schema/assets";

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

async function requestResource(
  url: URL,
  request: typeof fetch,
  origin: string,
  cache?: RequestCache,
): Promise<Response> {
  const response = await request(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { Origin: origin },
    cache,
  });
  if (!response.ok) throw new Error(`Resource ${url.pathname} returned HTTP ${response.status}`);
  const allowedOrigin = response.headers.get("access-control-allow-origin");
  if (allowedOrigin !== "*" && allowedOrigin !== origin)
    throw new Error(`Resource ${url.pathname} is missing website CORS access`);
  return response;
}

export async function verifyPublishedMarker(
  value: string,
  request: typeof fetch = fetch,
  origin = "https://loomix.fun",
): Promise<ReleaseMarker> {
  const base = parseReleaseBase(value);
  const response = await requestResource(
    new URL("_complete.json", base),
    request,
    origin,
    "no-store",
  );
  if (
    !response.headers
      .get("cache-control")
      ?.split(",")
      .some((value) => value.trim() === "no-store") ||
    /^(HIT|STALE|UPDATING)$/i.test(response.headers.get("cf-cache-status") ?? "")
  )
    throw new Error("Resource release marker must bypass caches");
  const marker = ReleaseMarkerSchema.parse(await response.json());
  if (base.pathname !== `/releases/${marker.release}/`)
    throw new Error("Resource release marker does not match the configured URL");
  return marker;
}

export async function downloadRelease(
  value: string,
  request: typeof fetch = fetch,
  origin = "https://loomix.fun",
  expectedMarker?: ReleaseMarker,
): Promise<Release> {
  const base = parseReleaseBase(value);
  const fetchFile = async (name: string): Promise<Buffer> =>
    Buffer.from(await (await requestResource(new URL(name, base), request, origin)).arrayBuffer());
  const marker = await verifyPublishedMarker(value, request, origin);
  if (
    expectedMarker &&
    (marker.release !== expectedMarker.release ||
      marker.manifestSha256 !== expectedMarker.manifestSha256)
  )
    throw new Error("Remote release does not match the uploaded release marker");
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
  const release = assembleRelease(manifest, documents);
  const image = release.assets.images[0];
  if (image) {
    const response = await requestResource(
      new URL(sharedImagePath(image.file), base),
      request,
      origin,
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    const cache = response.headers
      .get("cache-control")
      ?.split(",")
      .map((value) => value.trim());
    if (
      response.headers.get("content-type") !== "image/webp" ||
      !cache?.includes("immutable") ||
      !cache.includes("max-age=31536000") ||
      bytes.length !== image.bytes ||
      sha256(bytes) !== image.sha256
    )
      throw new Error(`Public image verification failed: ${image.file}`);
  }
  return release;
}
