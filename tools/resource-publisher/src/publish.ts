import { readRegularFile, validateContent } from "./validate.ts";
import { releaseIdSchema, sha256 } from "./release.ts";
import type { ReleaseMarker } from "./release.ts";
import type { ReleaseStore } from "./store.ts";

export async function publishRelease(
  directory: string,
  release: string,
  store: ReleaseStore,
): Promise<ReleaseMarker> {
  releaseIdSchema.parse(release);
  const content = await validateContent(directory);
  const prefix = `releases/${release}/`;
  if (await store.hasObjects(prefix))
    throw new Error(`Release already exists: ${release}. Use a new release ID.`);

  // A conditional reservation prevents concurrent publishers from sharing a release prefix.
  const reservation = Buffer.from(
    JSON.stringify({ release, contentSha256: content.contentSha256 }),
  );
  await store.put(`${prefix}_upload.json`, reservation, "application/json", sha256(reservation));
  const batchSize = 8;
  for (let offset = 0; offset < content.assets.length; offset += batchSize) {
    await Promise.all(
      content.assets.slice(offset, offset + batchSize).map(async (asset) => {
        const bytes = await readRegularFile(asset.path);
        if (sha256(bytes) !== asset.sha256)
          throw new Error(`Image changed during publication: ${asset.key}`);
        await store.put(`${prefix}${asset.key}`, bytes, "image/webp", asset.sha256);
        await store.verify(`${prefix}${asset.key}`, asset.size, asset.sha256);
      }),
    );
  }
  await store.put(
    `${prefix}content.json`,
    content.json,
    "application/json; charset=utf-8",
    content.contentSha256,
  );
  await store.verify(`${prefix}content.json`, content.json.length, content.contentSha256);
  const marker: ReleaseMarker = {
    release,
    contentSha256: content.contentSha256,
    assetCount: content.assets.length,
  };
  const bytes = Buffer.from(JSON.stringify(marker));
  await store.put(`${prefix}_complete.json`, bytes, "application/json", sha256(bytes));
  await store.verify(`${prefix}_complete.json`, bytes.length, sha256(bytes));
  return marker;
}
