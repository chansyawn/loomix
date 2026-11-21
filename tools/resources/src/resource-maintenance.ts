import { configuredStore, defaultBucket } from "./configuration.ts";
import {
  listReleases,
  runCleanup,
  type CleanupOptions,
  type CleanupReport,
} from "./maintenance.ts";

export async function listResourceReleases(bucket?: string) {
  return listReleases(await configuredStore(bucket));
}

export async function runResourceCleanup(
  { bucket = defaultBucket, ...options }: Omit<CleanupOptions, "bucket"> & { bucket?: string },
  report: (plan: CleanupReport) => void,
): Promise<void> {
  await runCleanup(await configuredStore(bucket), { bucket, ...options }, report);
}
