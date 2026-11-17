import { loadEnvironment } from "./environment.ts";
import { createR2Store } from "./store.ts";
import type { ReleaseStore } from "./store.ts";

export const defaultBucket = "loomix-assets";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function configuredStore(bucket = defaultBucket): ReleaseStore {
  loadEnvironment();
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/.test(accountId)) throw new Error("Invalid CLOUDFLARE_ACCOUNT_ID");
  return createR2Store(
    accountId,
    bucket,
    requiredEnv("R2_ACCESS_KEY_ID"),
    requiredEnv("R2_SECRET_ACCESS_KEY"),
  );
}
