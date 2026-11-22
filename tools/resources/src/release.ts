import { createHash } from "node:crypto";
import { sharedImagePath } from "@loomix/schema/assets";
import { ReleaseIdSchema, ReleaseMarkerSchema, type ReleaseMarker } from "@loomix/schema/release";
import {
  assembleWebsiteResources,
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceManifestSchema,
  type WebsiteResourceDocumentType,
  type WebsiteResources,
} from "@loomix/schema/website-resources";

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

export async function verifyPublishedManifest(
  value: string,
  request: typeof fetch = fetch,
  origin = "https://loomix.fun",
  expectedMarker?: ReleaseMarker,
) {
  const base = parseReleaseBase(value);
  const marker = await verifyPublishedMarker(value, request, origin);
  if (
    expectedMarker &&
    (marker.release !== expectedMarker.release ||
      marker.manifestSha256 !== expectedMarker.manifestSha256)
  )
    throw new Error("Remote release does not match the expected completion marker");
  const response = await requestResource(
    new URL(WEBSITE_RESOURCE_MANIFEST_FILE, base),
    request,
    origin,
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== marker.manifestSha256)
    throw new Error("Website resource manifest SHA-256 mismatch");
  const manifest = WebsiteResourceManifestSchema.parse(JSON.parse(bytes.toString("utf8")));
  return { marker, manifest };
}

export async function downloadRelease(
  value: string,
  request: typeof fetch = fetch,
  origin = "https://loomix.fun",
  expectedMarker?: ReleaseMarker,
): Promise<WebsiteResources> {
  const base = parseReleaseBase(value);
  const fetchFile = async (name: string): Promise<Buffer> =>
    Buffer.from(await (await requestResource(new URL(name, base), request, origin)).arrayBuffer());
  const { manifest } = await verifyPublishedManifest(value, request, origin, expectedMarker);
  const documents = new Map<WebsiteResourceDocumentType, unknown>();
  await Promise.all(
    manifest.files.map(async (file) => {
      const bytes = await fetchFile(file.path);
      if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256)
        throw new Error(`Document SHA-256 or size mismatch: ${file.path}`);
      documents.set(file.kind, JSON.parse(bytes.toString("utf8")));
    }),
  );
  const resources = assembleWebsiteResources(manifest, documents);
  const image = resources.imageIndex.images[0];
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
  return resources;
}
