import { setTimeout as delay } from "node:timers/promises";
import { downloadRelease } from "@loomix/resources/release";
import type { ReleaseMarker } from "@loomix/schema/release";
import { builtResourceFile, verifyResourceBinding } from "./built-resource.ts";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";
import { isPreviewHostname } from "../src/infrastructure/preview-domain.ts";

export async function verifyPreview(
  value: string,
  expectedResourceBaseUrl: string,
  request: typeof fetch = fetch,
  expectedMarker?: ReleaseMarker,
): Promise<void> {
  const preview = new URL(value);
  if (preview.protocol !== "https:" || preview.username || preview.password) {
    throw new Error("Preview URL must use HTTPS without credentials");
  }
  if (!isPreviewHostname(preview.hostname)) {
    throw new Error("Preview URL must use the preview.loomix.fun domain");
  }
  let verifiedResourceBaseUrl = expectedResourceBaseUrl;
  for (const [pathname, contentType] of [
    ["/", "text/html"],
    ["/logo.png", "image/png"],
    [`/${builtResourceFile}`, "application/json"],
  ]) {
    const response = await request(new URL(pathname, preview), {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
      cache: "no-store",
    });
    try {
      if (!response.ok) throw new Error(`Preview ${pathname} returned HTTP ${response.status}`);
      if (response.headers.get("content-type")?.split(";")[0].trim() !== contentType) {
        throw new Error(`Preview ${pathname} must return ${contentType}`);
      }
      const directives = response.headers.get("x-robots-tag")?.split(",");
      if (!directives?.some((value) => value.trim().toLowerCase() === "noindex")) {
        throw new Error(`Preview ${pathname} is missing noindex`);
      }
      if (pathname === `/${builtResourceFile}`) {
        verifiedResourceBaseUrl = verifyResourceBinding(
          await response.json(),
          expectedResourceBaseUrl,
        );
      }
    } finally {
      if (!response.bodyUsed) await response.body?.cancel();
    }
  }
  await downloadRelease(verifiedResourceBaseUrl, request, preview.origin, expectedMarker);
}

export async function retryPreview(check: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await check();
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await delay(5_000);
    }
  }
}

if (import.meta.main) {
  const url = process.argv[2];
  if (!url) throw new Error("Preview URL is required");
  const resourceBase = requireRemoteResources(resolveResourceConfig("production"));
  await retryPreview(() => verifyPreview(url, resourceBase));
  console.log(`Verified Preview HTTP, resource binding and CORS: ${url}`);
}
