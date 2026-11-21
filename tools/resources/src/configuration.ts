import { loadEnvironment } from "./environment.ts";

export const defaultBucket = "loomix-assets";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function configuredStore(bucket = defaultBucket) {
  loadEnvironment();
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/.test(accountId)) throw new Error("Invalid CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const { createR2Store } = await import("./store.ts");
  return createR2Store(accountId, bucket, accessKeyId, secretAccessKey);
}
