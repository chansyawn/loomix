import { downloadRelease } from "@loomix/resources/release";
import { releaseChecks, runReleaseChecks } from "./release-checks/index.ts";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

export async function verifyWebsiteRelease(
  resourceBaseUrl = requireRemoteResources(resolveResourceConfig("production")),
  log?: (message: string) => void,
): Promise<string> {
  const resources = await downloadRelease(resourceBaseUrl);
  await runReleaseChecks(resources, releaseChecks, log);
  return resourceBaseUrl;
}

if (import.meta.main) console.log(`Verified resource release: ${await verifyWebsiteRelease()}`);
