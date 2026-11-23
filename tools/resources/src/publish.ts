import { sharedImageKey } from "@loomix/schema/assets";
import { SHARED_IMAGE_LAYOUT } from "@loomix/schema/release";
import { readRegularFile } from "./files.ts";
import type { LocalImageFile, ValidatedWebsiteResources } from "./validate.ts";
import { sha256 } from "./release.ts";
import { createReleaseId } from "./release-id.ts";
import { PublicationError } from "./publication.ts";
import type { ReleaseMarker } from "@loomix/schema/release";
import { ObjectMissingError, type ReleaseStore } from "./store.ts";

export interface UploadProgress {
  phase: "images" | "finalizing" | "complete";
  completed: number;
  total: number;
  completedBytes: number;
  totalBytes: number;
}

async function reserveRelease(
  content: ValidatedWebsiteResources,
  store: ReleaseStore,
  date: Date,
): Promise<ReleaseMarker> {
  for (let sequence = 1; sequence <= 999; sequence++) {
    const release = createReleaseId(content.websiteResources.manifest, sequence, date);
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
    `当日当前版本的发布序号已用尽：${createReleaseId(content.websiteResources.manifest, 999, date)}；请等待下一个 UTC 日期，不要覆盖或回收占号。`,
  );
}

export async function publishValidatedContent(
  content: ValidatedWebsiteResources,
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

async function ensureImage(image: LocalImageFile, store: ReleaseStore): Promise<boolean> {
  const key = sharedImageKey(image.sha256);
  try {
    await store.verify(key, image.size, image.sha256);
    return false;
  } catch (error) {
    if (!(error instanceof ObjectMissingError)) throw error;
  }
  const bytes = await readRegularFile(image.path);
  if (sha256(bytes) !== image.sha256)
    throw new Error(`Image changed during publication: ${image.key}`);
  const created = await store.tryReserve(key, bytes, "image/webp", image.sha256);
  await store.verify(key, image.size, image.sha256);
  return created;
}

async function uploadContent(
  content: ValidatedWebsiteResources,
  marker: ReleaseMarker,
  store: ReleaseStore,
  onProgress?: (progress: UploadProgress) => void,
) {
  const prefix = `releases/${marker.release}/`;
  const progress: UploadProgress = {
    phase: "images",
    completed: 0,
    total: content.imageFiles.length,
    completedBytes: 0,
    totalBytes: content.imageFiles.reduce((sum, image) => sum + image.size, 0),
  };
  onProgress?.({ ...progress });
  const batchSize = 8;
  let uploadedImageCount = 0;
  let active = true;
  try {
    for (let offset = 0; offset < content.imageFiles.length; offset += batchSize) {
      await Promise.all(
        content.imageFiles.slice(offset, offset + batchSize).map(async (image) => {
          if (await ensureImage(image, store)) uploadedImageCount++;
          if (active) {
            progress.completed++;
            progress.completedBytes += image.size;
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
  return { uploadedImageCount, reusedImageCount: content.imageFiles.length - uploadedImageCount };
}
