import { sharedImageKey } from "@loomix/schema/assets";
import { SHARED_IMAGE_LAYOUT } from "@loomix/schema/release";
import { readRegularFile } from "./files.ts";
import type { AssetFile, ValidatedContent } from "./validate.ts";
import { sha256 } from "./release.ts";
import { createReleaseId } from "./release-id.ts";
import type { ReleaseMarker } from "./release.ts";
import { ObjectMissingError, type ReleaseStore } from "./store.ts";

export type { ReleaseStore } from "./store.ts";

export interface UploadProgress {
  phase: "images" | "finalizing" | "complete";
  completed: number;
  total: number;
  completedBytes: number;
  totalBytes: number;
}

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

async function reserveRelease(
  content: ValidatedContent,
  store: ReleaseStore,
  date: Date,
): Promise<ReleaseMarker> {
  for (let sequence = 1; sequence <= 999; sequence++) {
    const release = createReleaseId(content.release.manifest, sequence, date);
    const marker = {
      release,
      manifestSha256: content.manifestSha256,
      storageLayout: SHARED_IMAGE_LAYOUT,
    } satisfies ReleaseMarker;
    const bytes = Buffer.from(JSON.stringify(marker));
    try {
      if (
        await store.tryReserve(
          `releases/${release}/_upload.json`,
          bytes,
          "application/json",
          sha256(bytes),
        )
      )
        return marker;
    } catch (cause) {
      throw new PublicationError(release, "reservation", cause);
    }
  }
  throw new Error(
    `当日当前版本的发布序号已用尽：${createReleaseId(content.release.manifest, 999, date)}；请等待下一个 UTC 日期，不要覆盖或回收占号。`,
  );
}

export async function publishValidatedContent(
  content: ValidatedContent,
  store: ReleaseStore,
  onProgress?: (progress: UploadProgress) => void,
  date = new Date(),
) {
  const marker = await reserveRelease(content, store, date);
  try {
    return { ...marker, ...(await uploadContent(content, marker, store, onProgress)) };
  } catch (cause) {
    throw new PublicationError(marker.release, "upload", cause);
  }
}

async function ensureImage(asset: AssetFile, store: ReleaseStore): Promise<boolean> {
  const key = sharedImageKey(asset.sha256);
  try {
    await store.verify(key, asset.size, asset.sha256);
    return false;
  } catch (error) {
    if (!(error instanceof ObjectMissingError)) throw error;
  }
  const bytes = await readRegularFile(asset.path);
  if (sha256(bytes) !== asset.sha256)
    throw new Error(`Image changed during publication: ${asset.key}`);
  const created = await store.tryReserve(key, bytes, "image/webp", asset.sha256);
  await store.verify(key, asset.size, asset.sha256);
  return created;
}

async function uploadContent(
  content: ValidatedContent,
  marker: ReleaseMarker,
  store: ReleaseStore,
  onProgress?: (progress: UploadProgress) => void,
) {
  const prefix = `releases/${marker.release}/`;
  const progress: UploadProgress = {
    phase: "images",
    completed: 0,
    total: content.assets.length,
    completedBytes: 0,
    totalBytes: content.assets.reduce((sum, asset) => sum + asset.size, 0),
  };
  onProgress?.({ ...progress });
  const batchSize = 8;
  let uploadedImageCount = 0;
  let active = true;
  try {
    for (let offset = 0; offset < content.assets.length; offset += batchSize) {
      await Promise.all(
        content.assets.slice(offset, offset + batchSize).map(async (asset) => {
          if (await ensureImage(asset, store)) uploadedImageCount++;
          if (active) {
            progress.completed++;
            progress.completedBytes += asset.size;
            onProgress?.({ ...progress });
          }
        }),
      );
    }
  } finally {
    active = false;
  }
  onProgress?.({ ...progress, phase: "finalizing" });
  for (const document of content.documents) {
    await store.put(
      `${prefix}${document.key}`,
      document.bytes,
      "application/json; charset=utf-8",
      document.sha256,
    );
    await store.verify(`${prefix}${document.key}`, document.bytes.length, document.sha256);
  }
  const bytes = Buffer.from(JSON.stringify(marker));
  await store.put(`${prefix}_complete.json`, bytes, "application/json", sha256(bytes), "no-store");
  await store.verify(`${prefix}_complete.json`, bytes.length, sha256(bytes));
  onProgress?.({ ...progress, phase: "complete" });
  return { uploadedImageCount, reusedImageCount: content.assets.length - uploadedImageCount };
}
