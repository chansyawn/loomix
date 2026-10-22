import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishRelease } from "./publish.ts";
import { releaseIdSchema } from "./release.ts";
import { createR2Store } from "./store.ts";
import { validateContent } from "./validate.ts";
import { loadEnvironment } from "./environment.ts";
import { createUploadProgress } from "./progress.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      content: { type: "string" },
      release: { type: "string" },
      bucket: { type: "string", default: "loomix-assets" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Usage: vp run @loomix/resource-publisher#publish --content <directory> --release <id> [--bucket loomix-assets] [--dry-run]\nRelative content paths resolve from the repository root.\nCredentials: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.\nAutomatically loads tools/resource-publisher/.env; existing environment variables take precedence. Copy .env.example in that directory to get started.\nProgress is written to stderr; the final JSON is written to stdout. --help and --dry-run do not require credentials.",
    );
    return;
  }
  if (!values.content || !values.release)
    throw new Error("--content and --release are required; use --help for usage");
  releaseIdSchema.parse(values.release);
  const repoRoot = new URL("../../../", import.meta.url);
  const directory = path.resolve(fileURLToPath(repoRoot), values.content);
  if (values["dry-run"]) {
    const content = await validateContent(directory);
    console.log(
      JSON.stringify({
        release: values.release,
        contentSha256: content.contentSha256,
        assetCount: content.assets.length,
        dryRun: true,
      }),
    );
    return;
  }
  loadEnvironment();
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/.test(accountId)) throw new Error("Invalid CLOUDFLARE_ACCOUNT_ID");
  const store = createR2Store(
    accountId,
    values.bucket,
    requiredEnv("R2_ACCESS_KEY_ID"),
    requiredEnv("R2_SECRET_ACCESS_KEY"),
  );
  const progress = createUploadProgress();
  try {
    const marker = await publishRelease(directory, values.release, store, progress.update);
    console.log(JSON.stringify({ bucket: values.bucket, ...marker }));
  } catch (error) {
    progress.fail();
    throw error;
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Resource publication failed");
  process.exitCode = 1;
}
