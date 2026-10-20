import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishRelease } from "./publish.ts";
import { releaseIdSchema } from "./release.ts";
import { createR2Store } from "./store.ts";
import { validateContent } from "./validate.ts";

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
      bucket: { type: "string", default: "loomix-resources" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Usage: vp run --no-cache @loomix/resource-publisher#publish --content <directory> --release <id> [--bucket loomix-resources] [--dry-run]\nRelative content paths resolve from the repository root.\nCredentials: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.",
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
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  if (!/^[a-f0-9]{32}$/.test(accountId)) throw new Error("Invalid CLOUDFLARE_ACCOUNT_ID");
  const store = createR2Store(
    accountId,
    values.bucket,
    requiredEnv("R2_ACCESS_KEY_ID"),
    requiredEnv("R2_SECRET_ACCESS_KEY"),
  );
  const marker = await publishRelease(directory, values.release, store);
  console.log(JSON.stringify({ bucket: values.bucket, ...marker }));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Resource publication failed");
  process.exitCode = 1;
}
