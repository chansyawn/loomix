import { setTimeout as delay } from "node:timers/promises";
import { downloadRelease } from "@loomix/resource-publisher/release";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

export async function verifyPreview(
  value: string,
  resourceBase: string,
  request: typeof fetch = fetch,
): Promise<void> {
  const preview = new URL(value);
  if (preview.protocol !== "https:" || preview.username || preview.password) {
    throw new Error("Preview URL must use HTTPS without credentials");
  }
  for (const [pathname, contentType] of [
    ["/", "text/html"],
    ["/logo.png", "image/png"],
  ]) {
    const response = await request(new URL(pathname, preview), {
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`Preview ${pathname} returned HTTP ${response.status}`);
    if (response.headers.get("content-type")?.split(";")[0].trim() !== contentType) {
      throw new Error(`Preview ${pathname} must return ${contentType}`);
    }
  }
  await downloadRelease(resourceBase, request, preview.origin);
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
  console.log(`Verified Preview HTTP and resource CORS: ${url}`);
}
