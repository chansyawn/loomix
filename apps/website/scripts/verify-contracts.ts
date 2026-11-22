import { loadWebsiteResources } from "@loomix/resources/website-resources";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { resolveResourceConfig } from "./resource-config.ts";

const config = resolveResourceConfig("development");
if (config.source !== "local") {
  throw new Error(
    "发布契约检查需要本地资源；请检查 VITE_RESOURCE_BASE_URL，或运行 vp run website#verify-release 检查已发布版本。",
  );
}

const resources = await loadWebsiteResources(config.directory);
console.log(
  `检查本地网站资源：datasetId=${resources.manifest.datasetId}，formatVersion=${resources.manifest.formatVersion}，locale=${resources.manifest.locale}`,
);
await runReleaseChecks(resources, releaseChecks);
