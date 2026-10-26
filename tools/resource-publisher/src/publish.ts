import { readRegularFile, validateContent } from "./validate.ts";
import { releaseIdSchema, sha256 } from "./release.ts";
import type { ReleaseMarker } from "./release.ts";
import type { ReleaseStore } from "./store.ts";

export interface UploadProgress {
  phase: "images" | "finalizing" | "complete";
  completed: number;
  total: number;
  completedBytes: number;
  totalBytes: number;
}

export async function publishRelease(
  directory: string,
  release: string,
  store: ReleaseStore,
  onProgress?: (progress: UploadProgress) => void,
): Promise<ReleaseMarker> {
  releaseIdSchema.parse(release);
  const content = await validateContent(directory);
  const prefix = `releases/${release}/`;

  const reservation = Buffer.from(
    JSON.stringify({ release, contentSha256: content.contentSha256 }),
  );
  if (
    !(await store.tryReserve(
      `${prefix}_upload.json`,
      reservation,
      "application/json",
      sha256(reservation),
    ))
  ) {
    throw new Error(`Release already exists: ${release}. Use a new release ID.`);
  }
  const progress: UploadProgress = {
    phase: "images",
    completed: 0,
    total: content.assets.length,
    completedBytes: 0,
    totalBytes: content.assets.reduce((sum, asset) => sum + asset.size, 0),
  };
  onProgress?.({ ...progress });
  const batchSize = 8;
  let active = true;
  try {
    for (let offset = 0; offset < content.assets.length; offset += batchSize) {
      await Promise.all(
        content.assets.slice(offset, offset + batchSize).map(async (asset) => {
          const bytes = await readRegularFile(asset.path);
          if (sha256(bytes) !== asset.sha256)
            throw new Error(`Image changed during publication: ${asset.key}`);
          await store.put(`${prefix}${asset.key}`, bytes, "image/webp", asset.sha256);
          await store.verify(`${prefix}${asset.key}`, asset.size, asset.sha256);
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
  await store.put(
    `${prefix}content.json`,
    content.json,
    "application/json; charset=utf-8",
    content.contentSha256,
  );
  await store.verify(`${prefix}content.json`, content.json.length, content.contentSha256);
  await store.put(
    `${prefix}neighbors.json`,
    content.neighbors,
    "application/json; charset=utf-8",
    content.neighborsSha256,
  );
  await store.verify(`${prefix}neighbors.json`, content.neighbors.length, content.neighborsSha256);
  await store.put(
    `${prefix}neighbor-images.json`,
    content.neighborImages,
    "application/json; charset=utf-8",
    content.neighborImagesSha256,
  );
  await store.verify(
    `${prefix}neighbor-images.json`,
    content.neighborImages.length,
    content.neighborImagesSha256,
  );
  const marker: ReleaseMarker = {
    release,
    contentSha256: content.contentSha256,
    neighborsSha256: content.neighborsSha256,
    neighborImagesSha256: content.neighborImagesSha256,
    assetCount: content.assets.length,
    neighborCount: content.neighborCount,
  };
  const bytes = Buffer.from(JSON.stringify(marker));
  await store.put(`${prefix}_complete.json`, bytes, "application/json", sha256(bytes));
  await store.verify(`${prefix}_complete.json`, bytes.length, sha256(bytes));
  onProgress?.({ ...progress, phase: "complete" });
  return marker;
}
