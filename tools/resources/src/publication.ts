import { createReleaseId } from "./release-id.ts";
import { configuredStore } from "./configuration.ts";
import type { UploadProgress } from "./publish.ts";
import type { ValidatedWebsiteResources } from "./validate.ts";

export class PublicationError extends Error {
  readonly release: string;
  readonly phase: "reservation" | "upload";

  constructor(release: string, phase: "reservation" | "upload", cause: unknown) {
    super(
      `资源发布失败：${release}（${phase}）：${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = "PublicationError";
    this.release = release;
    this.phase = phase;
  }
}

export function describePublication(content: ValidatedWebsiteResources, now?: Date) {
  return {
    releaseId: createReleaseId(content.websiteResources.manifest, 1, now),
    manifestSha256: content.manifestSha256,
    imageFileCount: content.imageFiles.length,
    documentCount: content.documents.length,
    dryRun: true,
    reserved: false,
  } as const;
}

export async function publishRelease(
  content: ValidatedWebsiteResources,
  options: { bucket?: string; now?: Date; onProgress?: (progress: UploadProgress) => void } = {},
) {
  const store = await configuredStore(options.bucket);
  const { publishValidatedContent } = await import("./publish.ts");
  return publishValidatedContent(content, store, options.onProgress, options.now);
}

export async function withUploadProgress<Result>(
  publish: (onProgress: (progress: UploadProgress) => void) => Promise<Result>,
): Promise<Result> {
  const { createUploadProgress } = await import("./progress.ts");
  const progress = createUploadProgress();
  try {
    return await publish(progress.update);
  } catch (error) {
    progress.fail();
    throw error;
  }
}
