import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishValidatedContent } from "./publish.ts";
import { createReleaseId } from "./release-id.ts";
import { configuredStore, defaultBucket } from "./configuration.ts";
import { validateContent } from "./validate.ts";
import { createUploadProgress } from "./progress.ts";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      content: { type: "string", default: "resources/website" },
      bucket: { type: "string", default: defaultBucket },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(
      "Usage: vp run @loomix/resource-publisher#publish [--content resources/website] [--bucket loomix-assets] [--dry-run]\nRelease IDs are generated as YYYYMMDD-g<gameVersion>-f<formatVersion>-r001 using the UTC date and atomic reservation (r001–r999).\nRelative content paths resolve from the repository root.\nCredentials: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.\nAutomatically loads the repository-root .env; existing environment variables take precedence. Copy the repository-root .env.example to get started.\nProgress is written to stderr; the final JSON is written to stdout. --help and --dry-run do not require credentials. Dry-run IDs are unreserved candidates and may differ from the published ID.",
    );
    return;
  }
  const repoRoot = new URL("../../../", import.meta.url);
  const directory = path.resolve(fileURLToPath(repoRoot), values.content);
  const content = await validateContent(directory);
  if (values["dry-run"]) {
    console.log(
      JSON.stringify({
        release: createReleaseId(content.release.manifest),
        manifestSha256: content.manifestSha256,
        assetCount: content.assets.length,
        documentCount: content.documents.length,
        dryRun: true,
        reserved: false,
      }),
    );
    return;
  }
  const store = configuredStore(values.bucket);
  const progress = createUploadProgress();
  try {
    const marker = await publishValidatedContent(content, store, progress.update);
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
