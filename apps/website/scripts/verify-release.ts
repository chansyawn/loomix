import { downloadRelease } from "@loomix/resource-publisher/release";
import { requireRemoteResources, resolveResourceConfig } from "./resource-config.ts";

const resourceBaseUrl = requireRemoteResources(resolveResourceConfig("production"));
await downloadRelease(resourceBaseUrl);
console.log(`Verified resource release: ${resourceBaseUrl}`);
