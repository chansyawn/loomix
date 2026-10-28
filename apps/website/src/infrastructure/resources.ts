import { documentPath, parseReleaseManifest } from "@loomix/schema/release";
import type { DocumentKind } from "@loomix/schema/release";

const resourceBase = import.meta.env.VITE_RESOURCE_BASE_URL;
export function resourceUrl(path: string): string {
  return `${resourceBase}${path}`;
}

export function createResourceReader(request: typeof fetch = fetch) {
  const pendingManifest = request(resourceUrl("release.json")).then(async (response) => {
    if (!response.ok) throw new Error(`Unable to load release: ${response.status}`);
    return parseReleaseManifest(await response.json());
  });
  return async function loadResourceDocument<
    T extends { snapshotId: string; locale: string; formatVersion: number },
  >(kind: DocumentKind, parse: (input: unknown) => T): Promise<T> {
    const manifest = await pendingManifest;
    const file = manifest.files.find((file) => file.kind === kind);
    if (!file || file.path !== documentPath(kind, manifest.locale))
      throw new Error(`Missing resource document ${kind}`);
    const response = await request(resourceUrl(file.path));
    if (!response.ok) throw new Error(`Unable to load ${kind}: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (bytes.byteLength !== file.bytes || hash !== file.sha256)
      throw new Error(`Resource integrity mismatch: ${kind}`);
    const document = parse(JSON.parse(new TextDecoder().decode(bytes)));
    if (
      document.snapshotId !== manifest.snapshotId ||
      document.locale !== manifest.locale ||
      document.formatVersion !== manifest.formatVersion
    )
      throw new Error(`Resource context mismatch: ${kind}`);
    return document;
  };
}
