import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite-plus";
import { parseReleaseBase } from "@loomix/resources/release";
import {
  parseResourceAddressConfig,
  resourceAddressConfigPath,
} from "./resource-address-config.ts";

export const websiteRoot = fileURLToPath(new URL("../", import.meta.url));
export const repoRoot = path.resolve(websiteRoot, "../..");
export const defaultLocalResourcesPath = "resources/website";
export type ResourceConfig =
  | { source: "local"; directory: string; resourceBaseUrl: "/resources/" }
  | { source: "remote"; resourceBaseUrl: string };

export function resolveResourceConfig(mode: string, root: string = websiteRoot): ResourceConfig {
  const repository = path.resolve(root, "../..");
  const env = loadEnv(mode, repository, "VITE_");
  let value = env.VITE_RESOURCE_BASE_URL;
  if (value === undefined) {
    if (mode === "development" || mode === "test") {
      value = defaultLocalResourcesPath;
    } else {
      const config = parseResourceAddressConfig(
        JSON.parse(readFileSync(resourceAddressConfigPath(root), "utf8")),
      );
      return { source: "remote", resourceBaseUrl: config.resourceBaseUrl };
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
    directory: path.resolve(repository, value),
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
