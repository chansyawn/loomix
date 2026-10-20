import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite-plus";
import { z } from "zod";
import { parseReleaseBase } from "@loomix/resource-publisher/release";

export const websiteRoot = fileURLToPath(new URL("../", import.meta.url));
export type ResourceConfig =
  | { source: "local"; directory: string; resourceBaseUrl: "/resources/" }
  | { source: "remote"; resourceBaseUrl: string };

export function resolveResourceConfig(mode: string, root: string = websiteRoot): ResourceConfig {
  const env = loadEnv(mode, root, "VITE_");
  let value = env.VITE_RESOURCE_BASE_URL;
  if (value === undefined) {
    if (mode === "development" || mode === "test") {
      value = "resources/website/";
    } else {
      const release = z
        .strictObject({ resourceBaseUrl: z.string() })
        .parse(JSON.parse(readFileSync(path.join(root, "release.json"), "utf8")));
      value = release.resourceBaseUrl;
    }
  }
  if (/^https:\/\//i.test(value)) {
    return { resourceBaseUrl: parseReleaseBase(value).href, source: "remote" };
  }
  if (
    !value.trim() ||
    value !== value.trim() ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)
  ) {
    throw new Error(
      "Resource base must be a repository-relative directory or an HTTPS release URL.",
    );
  }
  return {
    source: "local",
    directory: path.resolve(root, "../..", value),
    resourceBaseUrl: "/resources/",
  };
}

export function requireRemoteResources(config: ResourceConfig): string {
  if (config.source === "local") {
    throw new Error(
      "Deployment requires a published remote resource release. Unset the local VITE_RESOURCE_BASE_URL override or select an HTTPS release URL.",
    );
  }
  return config.resourceBaseUrl;
}
