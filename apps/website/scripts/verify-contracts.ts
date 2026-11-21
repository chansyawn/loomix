import { loadReleaseDirectory } from "@loomix/resources/delivery";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { resolveResourceConfig } from "./resource-config.ts";

const config = resolveResourceConfig("development");
if (config.source !== "local") {
  throw new Error(
    "发布契约检查需要本地资源；请检查 VITE_RESOURCE_BASE_URL，或运行 vp run website#verify-release 检查已发布版本。",
  );
}

const release = await loadReleaseDirectory(config.directory);
console.log(
  `检查本地资源：snapshotId=${release.manifest.snapshotId}，formatVersion=${release.manifest.formatVersion}，locale=${release.manifest.locale}`,
);
await runReleaseChecks(release, releaseChecks);
