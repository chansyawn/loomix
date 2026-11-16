import { downloadRelease } from "@loomix/resource-publisher/release";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

const resourceBaseUrl = requireRemoteResources(resolveResourceConfig("production"));
const release = await downloadRelease(resourceBaseUrl);
await runReleaseChecks(release, releaseChecks);
console.log(`Verified resource release: ${resourceBaseUrl}`);
