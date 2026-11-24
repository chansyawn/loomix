import {
  documentPath,
  WEBSITE_RESOURCE_MANIFEST_FILE,
  WebsiteResourceManifestSchema,
  type WebsiteResourceDocumentType,
} from "@loomix/schema/website-resources";
import { sharedImagePath } from "@loomix/schema/assets";

const resourceBase = import.meta.env.VITE_RESOURCE_BASE_URL;
export function resourceUrl(path: string): string {
  if (path.startsWith("assets/") && !resourceBase.startsWith("/"))
    return new URL(sharedImagePath(path), resourceBase).href;
  return `${resourceBase}${path}`;
}

export function createResourceReader(request: typeof fetch = fetch) {
  const pendingManifest = request(resourceUrl(WEBSITE_RESOURCE_MANIFEST_FILE)).then(
    async (response) => {
      if (!response.ok)
        throw new Error(`Unable to load website resource manifest: ${response.status}`);
      return WebsiteResourceManifestSchema.parse(await response.json());
    },
  );
  // 文档通过清单中的哈希绑定到同一套网站资源，无需逐个核对上下文。
  return async function loadResourceDocument<T>(
    kind: WebsiteResourceDocumentType,
    parse: (input: unknown) => T,
    cache?: Map<string, Promise<T>>,
  ): Promise<T> {
    const manifest = await pendingManifest;
    const file = manifest.files.find((file) => file.kind === kind);
    if (!file || file.path !== documentPath(kind, manifest.locale))
      throw new Error(`Missing resource document ${kind}`);
    const key = `${file.path}:${file.sha256}:${file.bytes}`;
    const cached = cache?.get(key);
    if (cached) return cached;

    const pending = (async () => {
      const response = await request(resourceUrl(file.path));
      if (!response.ok) throw new Error(`Unable to load ${kind}: ${response.status}`);
      const bytes = await response.arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      if (bytes.byteLength !== file.bytes || hash !== file.sha256)
        throw new Error(`Resource integrity mismatch: ${kind}`);
      return parse(JSON.parse(new TextDecoder().decode(bytes)));
    })();
    cache?.set(key, pending);
    try {
      return await pending;
    } catch (error) {
      cache?.delete(key);
      throw error;
    }
  };
}
